/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

 export class AdalAuthError {
    private _error: string;
    private _errorDesc: string | null;

    constructor(error: string , errorDesc?: string) {
        this._error = error;
        this._errorDesc = null;
        if (errorDesc) {
            this._errorDesc = errorDesc;
        }
    }

    get error(): string {
        return this._error;
    }

    set error(value: string) {
        this._error = value;
    }

    get errorDesc(): string | null {
        return this._errorDesc;
    }

    set errorDesc(value: string | null) {
        this._errorDesc = value;
    }

}
