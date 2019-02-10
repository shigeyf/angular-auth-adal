/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

import { Inject, Injectable, InjectionToken, NgZone } from '@angular/core';
import { Observable } from 'rxjs/Rx'; // [RxJSv5]
// import { Observable, timer } from 'rxjs'; // [RxJSv6]
import { Router, RouterStateSnapshot } from '@angular/router';
import * as adaljs from 'adal-angular';

import { AdalAuthConfig } from './adal-authconfig';
import { AdalAuthBroadcastService } from './adal-authbroadcast.service';
import { AdalAuthError } from './adal-autherror';
import { AdalAuthResult } from './adal-authresult';


export const ADAL_AUTH_CONFIG = new InjectionToken<string>('ADAL_AUTH_CONFIG');

@Injectable()
export class AdalAuthService {
  private _context: adaljs.AuthenticationContext;
  private _adalAuthRefreshTimer = <any>null;
  _oauthData = { isAuthenticated: false, userName: '', profile: {}, loginError: '', idToken: {}, loginCached: false };

  private readonly logMessagePrefix: string = '[Angular] ';
  private readonly piiLogMessagePrefix: string = '[Angular][PII] ';

  constructor(@Inject(ADAL_AUTH_CONFIG) private config: AdalAuthConfig,
    private ngZone: NgZone,
    private router: Router,
    private adalAuthBroadcastService: AdalAuthBroadcastService) {
    if (!config) {
      throw new Error('You must set config, when calling init');
    }
    this._context = adaljs.inject({
      clientId: config.clientId,
      instance: config.instance,
      tenant: config.tenant,
      redirectUri: config.redirectUri,
      postLogoutRedirectUri: config.postLogoutRedirectUri,
      popUp: config.popUp,
      cacheLocation: config.cacheLocation,
      navigateToLoginRequestUrl: config.navigateToLoginRequestUrl,
      endpoints: config.endpoints,
      anonymousEndpoints: config.anonymousEndpoints,
      loginResource: config.loginResource,
      extraQueryParameter: config.extraQueryParameter,
      expireOffsetSeconds: config.expireOffsetSeconds,
      loadFrameTimeout: config.loadFrameTimeout,
      correlationId: config.correlationId,
      displayCall: config.displayCall
    });
    this._context.isAngular = true;
    this.setAdalLogging(config);
    this.updateAuthDataFromCache();
    if (this._oauthData.isAuthenticated && !this._adalAuthRefreshTimer && window.self === window.top) {
      this.setRefreshTimerForIdToken();
    }

    window.addEventListener('adal:popUpHashChanged', (e: CustomEvent) => {
      this.verbose('Event \'popUpHashChanged\' triggered');
      this.verbosePii('Event \'popUpHashChanged\' triggered: ' + e.detail);
      this.processPopupHash(e.detail, e);
    });
    window.addEventListener('adal:popUpClosed', (e: CustomEvent) => {
      this.verbose('Event \'popUpClosed\' triggered.');
    });

    this.verbose('[Angular] AdalAuthService Initialized.');
  }

  /*
   * ADAL.js - public functions
   */
  public login(): void {
    this.verbose('Called login');
    this._context.login();
  }

  public logout(): void {
    if (!this.loginInProgress()) {
      if (this._adalAuthRefreshTimer != null) {
        this._adalAuthRefreshTimer.unsubscribe();
        this._adalAuthRefreshTimer = null;
      }
      this.verbose('Called logout');
      this._context.logOut();
    } else {
      this.verbose('Cancelled logout due to a running login process currently.');
    }
  }

  public loginInProgress(): boolean {
    this.verbose('Called loginInProgress');
    return this._context.loginInProgress();
  }

  public setLoginStartPage(loginStartPage: string): void {
    this.verbose('Called setLoginStartPage');
    this._context._saveItem(this._context.CONSTANTS.STORAGE.ANGULAR_LOGIN_REQUEST, loginStartPage);
  }

  public getRequestedPage(): string {
    this.verbose('Called getRequestedPage');
    return this._context._getItem(this._context.CONSTANTS.STORAGE.LOGIN_REQUEST);
  }

  public getCachedToken(resource: string): string | null {
    this.verbose('Calling getCachedToken...');
    return this._context.getCachedToken(resource);
  }

  public getCachedUser(): adaljs.AuthenticationContext.UserInfo {
    this.verbose('Calling getCachedUser...');
    return this._context.getCachedUser();
  }

  public registerCallback(expectedState: string, resource: string,
    callback: (error_description: string, token: string, error: string) => void): void {
    this.verbose('Calling registerCallback...');
    return this._context.registerCallback(expectedState, resource, callback);
  }

  public loginPopup() {
    this.verbose('Calling loginPopup: Login Popup flow...');
    this.login();
  }

  public loginRedirect(): void {
    this.verbose('Calling loginRedirect: Login Redirect flow...');
    this.login();
  }

  // callback is configured within this function.
  // callback: (error_description: string, token: string, error: string) => void
  public acquireToken(resource: string): Promise<any> {
    this.verbose('Calling acquireToken...');
    return new Promise((resolve, reject) => {
      this._acquireToken(resource).then(
        (authResult: AdalAuthResult) => {
          this.adalAuthBroadcastService.broadcast('adal:acquireTokenSuccess', authResult);
          resolve(authResult);
        }, (error: AdalAuthError) => {
          reject(error);
        });
    });
  }
  private _acquireToken(resource: string): Promise<any> {
    this.verbose('Calling internal _acquireToken...');
    return new Promise((resolve, reject) => {
      this._context.acquireToken(resource, function(error_description: string, token: string, error: string, tokenType: string) {
        if (token) {
          const authResult = new AdalAuthResult(token, tokenType);
          resolve(authResult);
        } else {
          const authError = new AdalAuthError(error, error_description);
          reject(authError);
        }
      });
    });
  }

  // callback is configured within this function.
  // callback: (error_description: string, token: string, error: string) => void
  public acquireTokenPopup(resource: string, extraQueryParameters?: string, claims?: string): Promise<any> {
    this.verbose('Calling acquireTokenPopup...');
    return new Promise((resolve, reject) => {
      this._acquireTokenPopup(resource, extraQueryParameters, claims).then(
        (authResult: AdalAuthResult) => {
          this.adalAuthBroadcastService.broadcast('adal:acquireTokenPopupSuccess', authResult);
          resolve(authResult);
        }, (authError: AdalAuthError) => {
          reject(authError);
        });
    });
  }
  public _acquireTokenPopup(resource: string, extraQueryParameters?: string, claims?: string): Promise<any> {
    this.verbose('Calling internal _acquireTokenPopup...');
    return new Promise((resolve, reject) => {
      this._context.acquireTokenPopup(resource, extraQueryParameters, claims,
        function(error_description: string, token: string, error: string, tokenType: string) {
        if (token) {
          const authResult = new AdalAuthResult(token, tokenType);
          resolve(authResult);
        } else {
          const authError = new AdalAuthError(error, error_description);
          reject(authError);
        }
      });
    });
  }

  public acquireTokenRedirect(resource: string, extraQueryParameters: string, claims: string): void {
    this.verbose('Calling acquireTokenRedirect...');
    return this._context.acquireTokenRedirect(resource, extraQueryParameters, claims);
  }

  public promptUser(urlNavigate: string) {
    this.verbose('Calling promptUser...');
    return this._context.promptUser(urlNavigate);
  }

  public getUser(callback: (error: string, user: adaljs.AuthenticationContext.UserInfo) => void): void {
    this.verbose('Calling getUser...');
    return this._context.getUser(callback);
  }

  public getLoginError(): string {
    this.verbose('Calling getLoginError...');
    return this._context.getLoginError();
  }

  public clearCache(): void {
    this.verbose('Calling clearCache...');
    this._context.clearCache();
  }

  public clearCacheForResource(resource: string): void {
    this.verbose('Calling clearCacheForResource...');
    this._context.clearCacheForResource(resource);
  }

  public getResourceForEndpoint(url: string): string | null {
    this.verbose('Calling getResourceForEndpoint...');
    return this._context.getResourceForEndpoint(url);
  }

  public isCallback(hash: string): boolean {
    this.verbose('Calling isCallback...');
    return this._context.isCallback(hash);
  }

  public handleWindowCallback(hash?: string | undefined): void {
    this.verbose('Calling handleWindowCallback...');
    this.verbosePii('Handling hash = ' + hash);
    const reqHash = hash || window.location.hash;
    this._context.handleWindowCallback(hash);
    this.updateAuthDataFromCache();
    if (this._oauthData.isAuthenticated) {
      const requestInfo = this._context.getRequestInfo(reqHash);
      if (requestInfo.requestType === 'LOGIN' || requestInfo.requestType === 'RENEW_TOKEN') {
        const idToken = requestInfo.parameters[this._context.CONSTANTS.ID_TOKEN];
        if (idToken !== undefined) {
          this.setRefreshTimerForIdToken();
        }
      }
    }
  }

  public error(message: string, error: any) {
    this._context.error(this.logMessagePrefix + message, error);
  }

  public warn(message: string) {
    this._context.warn(this.logMessagePrefix + message);
  }

  public info(message: string) {
    this._context.info(this.logMessagePrefix + message);
  }

  public verbose(message: string) {
    this._context.verbose(this.logMessagePrefix + message);
  }

  public errorPii(message: string, error: any) {
    this._context.errorPii(this.piiLogMessagePrefix + message, error);
  }

  public warnPii(message: string) {
    this._context.warnPii(this.piiLogMessagePrefix + message);
  }

  public infoPii(message: string) {
    this._context.infoPii(this.piiLogMessagePrefix + message);
  }

  public verbosePii(message: string) {
    this._context.verbosePii(this.piiLogMessagePrefix + message);
  }


  /*
   * Functions for Angular integration with ADAL.js
   */
  public processPopupHash(hash: string, event: CustomEvent): void {
    this.verbose('Processing PopUp Hash for ADAL.js...');
    this.handleWindowCallback(hash);

    /* merged into handleWindowCallback since same logics between popup and redirect
    this.updateAuthDataFromCache();
    const requestInfo = this._context.getRequestInfo(hash);
    if (requestInfo.requestType === 'LOGIN') { // this._context.REQUEST_TYPE.LOGIN
      this.setRefreshTimerForIdToken();
    }
    */
  }

  public updateAuthDataFromCache(): void {
    this.verbose('Calling updateAuthDataFromCache to update OAuth data...');
    if (this._context.config.loginResource === undefined) {
      throw new Error('You must set loginResource in config');
    }
    const token = this._context.getCachedToken(this._context.config.loginResource);
    this._oauthData.isAuthenticated = token !== null && token.length > 0;

    this._oauthData.loginCached = false;
    const user = this._context.getCachedUser() || { userName: '', profile: {} };
    this._oauthData.userName = user.userName;
    this._oauthData.profile = user.profile;
    if (this._oauthData.userName !== '') {
      this._oauthData.loginCached = true;
    }
    this._oauthData.loginError = this._context.getLoginError();
    this._oauthData.idToken = token;

    this.verbosePii('OAuth data = ' + JSON.stringify(this._oauthData));
  }

  public getAuthContext(): adaljs.AuthenticationContext {
    return this._context;
  }

  private setAdalLogging(config: AdalAuthConfig): void {
    if (config.logLevel) { window['Logging'].level = config.logLevel; }
    if (config.logCallback && typeof config.logCallback === 'function') { window['Logging'].log = config.logCallback; }
    if (config.piiLoggingEnabled === true) { window['Logging'].piiLoggingEnabled = true; }
  }

  private setRefreshTimerForIdToken(): void {
    // Get expiration of Id Token
    const exp = this._context._getItem(this._context.CONSTANTS.STORAGE.EXPIRATION_KEY + <any>this._context.config.loginResource);
    // Either wait until the refresh window is valid or refresh in 1 second (measured in seconds)
    const timerDelay = ((exp - this.now() - (this._context.config.expireOffsetSeconds || 300)) > 0)
      ? (exp - this.now() - (this._context.config.expireOffsetSeconds || 300)) : 1;

    if (this._adalAuthRefreshTimer) {
      this._adalAuthRefreshTimer.unsubscribe();
    }
    this.ngZone.runOutsideAngular(() => {
      this.verbose('Set Refresh Timer for IdToken: ' + timerDelay + ' seconds.');
      this._adalAuthRefreshTimer = Observable.timer(timerDelay * 1000).subscribe(() => { this.refreshIdToken(); }); // [RxJSv5]
      // this._adalAuthRefreshTimer = timer(timerDelay * 1000).subscribe(() => { this.refreshIdToken(); }); // [RxJSv6]
    });
  }

  private refreshIdToken(): void {
    this.verbose('Refreshing IdToken...');
    if (this._context.config.loginResource === undefined) {
      throw new Error('You must set loginResource in config');
    }
    this.acquireToken(this._context.config.loginResource)
      .then((authResult: AdalAuthResult) => {
        this.verbose('Token refresh succeeded.' + authResult.tokenType);
        this.verbosePii('Refreshed IdToken = ' + authResult.token);
        this._oauthData.idToken = authResult.token;
        if (this._oauthData.isAuthenticated === false) {
            this._oauthData.isAuthenticated = true;
            this._oauthData.loginError = '';
            window.location.reload();
        } else {
            this.setRefreshTimerForIdToken();
        }
      },
      (authError: AdalAuthError) => {
        this.verbose('Token refresh error: ' + authError.error);
        this._oauthData.isAuthenticated = false;
        this._oauthData.idToken = '';
        this._oauthData.loginError = this.getLoginError();
        this.router.navigate(['/']);
        window.location.reload();
      });
  }

  private now(): number {
    return Math.round(new Date().getTime() / 1000.0);
  }

}
