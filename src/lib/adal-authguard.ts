/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

import { Inject, Injectable } from '@angular/core';
import { Location, PlatformLocation } from '@angular/common';
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';

import { AdalAuthService, ADAL_AUTH_CONFIG } from './adal-authservice';
import { AdalAuthConfig } from './adal-authconfig';
import { AdalAuthError } from './adal-autherror';
import { AdalAuthResult } from './adal-authresult';


@Injectable()
export class AdalAuthGuard implements CanActivate {

    constructor(@Inject(ADAL_AUTH_CONFIG) private config: AdalAuthConfig,
        private adalAuthService: AdalAuthService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private location: Location,
        private platformLocation: PlatformLocation) {
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> | boolean {
        this.adalAuthService.updateAuthDataFromCache();
        if (!this.adalAuthService._oauthData.isAuthenticated && this.adalAuthService._oauthData.userName === '') {
            if (state.url) {
                if (!this.adalAuthService.loginInProgress()) {
                    const loginStartPage = this.getBaseUrl() + state.url;
                    if (loginStartPage !== null) {
                        this.adalAuthService.setLoginStartPage(loginStartPage);
                    }
                    if (this.config.popUp) {
                        return new Promise((resolve, reject) => {
                            this.adalAuthService.loginPopup();
                            window.addEventListener('adal:popUpHashChanged', (e: CustomEvent) => {
                                resolve(true);
                            });
                            window.addEventListener('adal:popUpClosed', (e: CustomEvent) => {
                                reject(false);
                            });
                        });
                    } else {
                        this.adalAuthService.loginRedirect();
                        return this.adalAuthService._oauthData.isAuthenticated;
                    }
                } else {
                    return this.adalAuthService._oauthData.isAuthenticated;
                }
            } else {
                return this.adalAuthService._oauthData.isAuthenticated;
            }
        } else if (!this.adalAuthService._oauthData.isAuthenticated && this.adalAuthService._oauthData.userName !== '') {
            // token is expired or deleted but user data still exists in _oauthData object
            return new Promise((resolve, reject) => {
                this.adalAuthService.acquireToken(this.config.clientId) // Get ID Token
                .then((authResult: AdalAuthResult) => {
                    resolve (true);
                }, (authError: AdalAuthError) => {
                    if (authError.error === 'login_required') {
                        this.adalAuthService.verbose('acquiring token silently -> login_required');
                        this.adalAuthService._oauthData.loginError = this.adalAuthService.getLoginError();
                        this.adalAuthService.login();
                        window.addEventListener('adal:popUpHashChanged', (e: CustomEvent) => {
                            resolve(true);
                        });
                        window.addEventListener('adal:popUpClosed', (e: CustomEvent) => {
                            resolve(false);
                        });
                    }
                    resolve(false);
                });
            });
        } else {
            return this.adalAuthService._oauthData.isAuthenticated;
        }
    }

    private getBaseUrl(): String {
        let currentAbsoluteUrl = window.location.href;
        const currentRelativeUrl = this.location.path();
        if (this.isEmpty(currentRelativeUrl)) {
            if (currentAbsoluteUrl.endsWith('/')) {
                currentAbsoluteUrl = currentAbsoluteUrl.replace(/\/$/, '');
            }
            return currentAbsoluteUrl;
        } else {
            const index = currentAbsoluteUrl.indexOf(currentRelativeUrl);
            return currentAbsoluteUrl.substring(0, index);
        }
    }

    isEmpty = function (str: any) {
        return (typeof str === 'undefined' || !str || 0 === str.length);
    };
}
