/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

export class AdalAuthResult {
    private _token: string;
    private _tokenType: string | null;

    constructor(token: string, tokenType?: string) {
        this._token = token;
        this._tokenType = null;
        if (tokenType) {
            this._tokenType = tokenType;
        }
    }

    get token(): string {
        return this._token;
    }

    set token(value: string) {
        this._token = value;
    }

    get tokenType(): string | null {
        return this._tokenType;
    }

    set tokenType(value: string | null) {
        this._tokenType = value;
    }

}
