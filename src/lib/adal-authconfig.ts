/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

import * as adaljs from 'adal-angular';

/**
 * Configuration options for ADAL Authentication
 */
export class AdalAuthConfig {
    // ADAL Initialization parameters
    clientId: string; // Required configuration option
    instance?: string = 'https://login.microsoftonline.com/';
    tenant?: string = 'common';
    redirectUri?: string = 'window.location.href';
    postLogoutRedirectUri?: string;
    logOutUri?: string = 'https://login.microsoftonline.com/';
    popUp?: boolean = false;
    cacheLocation?: 'localStorage' | 'sessionStorage' = 'sessionStorage';
    navigateToLoginRequestUrl?: boolean = true;
    endpoints?: any;
    anonymousEndpoints?: string[] = [];
    loginResource?: string;
    extraQueryParameter?: string;
    expireOffsetSeconds?: number = 300;
    loadFrameTimeout?: number = 6000;
    correlationId?: string;
    displayCall?: (urlNavigate: string) => any;
    isAngular?: boolean = true;

    // ADAL Logging parameters
    logLevel?: adaljs.AuthenticationContext.LoggingLevel = 0;
    logCallback?: (message: string) => void;
    piiLoggingEnabled?: boolean = false;
}
