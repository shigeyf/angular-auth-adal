/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdalAuthConfig } from './adal-authconfig';
import { AdalAuthGuard } from './adal-authguard';
import { AdalAuthService, ADAL_AUTH_CONFIG } from './adal-authservice';
import { AdalAuthBroadcastService } from './adal-authbroadcast.service';

@NgModule({
  imports: [CommonModule],
  declarations: [],
  providers: [
    AdalAuthGuard,
    AdalAuthBroadcastService
  ],
})
export class AdalAuthModule {
  static forRoot(config: AdalAuthConfig): ModuleWithProviders {
    return {
      ngModule: AdalAuthModule,
      providers: [
        { provide: ADAL_AUTH_CONFIG, useValue: config },
        AdalAuthService
      ]
    };
  }
}
