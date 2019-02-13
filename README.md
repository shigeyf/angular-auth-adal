# angular-auth-adal - ADAL.js (Active Directory Authentication Library) for Angular

The ADAL library for Angular is a wrapper library of the core ADAL.js library which enables Angular (6 to 7) applications to authenticate enterprise users using Microsoft Azure Active Directory (AAD) and get access to Microsoft Cloud OR Microsoft Graph.

This authentication library can be used to authenticate Angular applications against Azure Active Directory v1 endpoint.

## Installation

The angular-auth-adal is available on NPM:

`npm install angular-auth-adal --save`

* NPM package v0.5.x is for Angular 5 with rxjs v5 or Angular 6 or later with rxjs v6 and rxjs-compat.
* NPM package v0.6.x or later is for Angular 6 or 7 with rxjs v6 (without rxjs-compat)

## Sample application

Here is a sample Angular application with this [active-directory-angular-spa](https://github.com/shigeyf/active-directory-angular-spa) module.

## Build

The angular-auth-adal is built on NPM:

1) `npm install`
2) `npm run build`

The environment for building this Angular package is:

| Builder           | Version |
| :---------------- | ------: |
| ng-packagr        |   4.7.0 |
| @angular/compiler |  6.1.10 |
| rollup            |  0.67.4 |
| tsickle           |  0.30.0 |
| typescript        |   2.9.2 |
