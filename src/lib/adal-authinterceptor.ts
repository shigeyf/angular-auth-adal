/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable'; // [RxJSv5]
// import 'rxjs/add/observable/fromPromise'; // [RxJSv5]
// import 'rxjs/add/operator/mergeMap'; // [RxJSv5]
import { Observable } from 'rxjs'; // [RxJSv6]
import { from } from 'rxjs'; // [RxJSv6]
import { tap, mergeMap } from 'rxjs/operators'; // [RxJSv6]
import { AdalAuthService } from './adal-authservice';
import { AdalAuthBroadcastService } from './adal-authbroadcast.service';
import { AdalAuthError } from './adal-autherror';
import { AdalAuthResult } from './adal-authresult';


@Injectable()
export class AdalAuthInterceptor implements HttpInterceptor {

    constructor(private adalAuthService: AdalAuthService, private broadcastService: AdalAuthBroadcastService) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const resource = this.adalAuthService.getResourceForEndpoint(req.url);
        this.adalAuthService.verbose('HTTP Auth Intercept - Url: ' + req.url + ' maps to scopes: ' + resource);
        if (resource === null) {
            return next.handle(req);
        }
        const tokenStored = this.adalAuthService.getCachedToken(resource);
        if (tokenStored) {
            this.adalAuthService.verbose('Using cached Access Token for ' + resource);
            req = req.clone({
              setHeaders: {
                    Authorization: `Bearer ${tokenStored}`,
                }
            });
            // [RxJSv5]
            /*
            return next.handle(req).do(event => {}, err => {
                if (err instanceof HttpErrorResponse && err.status === 401) {
                    const resource1 = this.adalAuthService.getResourceForEndpoint(req.url);
                    const tokenStored1 = this.adalAuthService.getCachedToken(resource1);
                    if (tokenStored1) {
                        this.adalAuthService.clearCacheForResource(resource1);
                    }
                    const adalAuthError = new AdalAuthError(JSON.stringify(err), '');
                    this.broadcastService.broadcast('adal:notAuthorized', adalAuthError);
                }
            });
            */
            // [RxJSv6]
            return next.handle(req).pipe(
                tap(event => {}, err => {
                    if (err instanceof HttpErrorResponse && err.status === 401) {
                        const resource1 = this.adalAuthService.getResourceForEndpoint(req.url);
                        const tokenStored1 = this.adalAuthService.getCachedToken(resource1);
                        if (tokenStored1) {
                            this.adalAuthService.clearCacheForResource(resource1);
                        }
                        const adalAuthError = new AdalAuthError(JSON.stringify(err), '');
                        this.broadcastService.broadcast('adal:notAuthorized', adalAuthError);
                    }
                })
            );
        } else {
            this.adalAuthService.verbose('Acquiring Access Token for ' + resource);
            // [RxJSv5]
            /*
            return Observable.fromPromise(this.adalAuthService.acquireToken(resource)
                .then((authResult: AdalAuthResult) => {
                    const JWT = `Bearer ${authResult.token}`;
                    return req.clone({ setHeaders: { Authorization: JWT }})
                })
            )
            .mergeMap(req => next.handle(req)
                .do(event => {}, err => {
                    if (err instanceof HttpErrorResponse && err.status === 401) {
                        const resource2 = this.adalAuthService.getResourceForEndpoint(req.url);
                        const tokenStored2 = this.adalAuthService.getCachedToken(resource2);
                        if (tokenStored2) {
                            this.adalAuthService.clearCacheForResource(resource2);
                        }
                        const adalAuthError = new AdalAuthError(JSON.stringify(err), '');
                        this.broadcastService.broadcast('adal:notAuthorized', adalAuthError);
                    }
                })
            );
            */
            // [RxJSv6]
            return from(this.adalAuthService.acquireToken(resource)
                .then((authResult: AdalAuthResult) => {
                    const JWT = `Bearer ${authResult.token}`;
                    return req.clone({ setHeaders: { Authorization: JWT } });
                })
            )
            .pipe(
                mergeMap(req2 => next.handle(req2).pipe(
                    tap(event => {}, err => {
                        if (err instanceof HttpErrorResponse && err.status === 401) {
                            const resource2 = this.adalAuthService.getResourceForEndpoint(req2.url);
                            const tokenStored2 = this.adalAuthService.getCachedToken(resource2);
                            if (tokenStored2) {
                                this.adalAuthService.clearCacheForResource(resource2);
                            }
                            const adalAuthError = new AdalAuthError(JSON.stringify(err), '');
                            this.broadcastService.broadcast('adal:notAuthorized', adalAuthError);
                        }
                    })
                ))
            );
            // calling next.handle means we are passing control to next interceptor in chain
        }
    }
}
