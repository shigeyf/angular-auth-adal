/*
 * Copyright (c) 2019
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
// import 'rxjs/add/operator/filter'; // [RxJSv5]
// import 'rxjs/add/operator/map'; // [RxJSv5]
import { map, filter } from 'rxjs/operators'; // [RxJSv6]

export type MessageCallback = (payload: any) => void;

@Injectable()
export class AdalAuthBroadcastService {
    private _adalSubject: BehaviorSubject<any>;

    constructor() {
        this._adalSubject = new BehaviorSubject<any>(1);
    }

    getAdalSubject() {
        return this._adalSubject;
    }

    broadcast(type: string, payload: any) {
        this._adalSubject.next({type , payload});
    }

    subscribe(type: string, callback: MessageCallback): Subscription {
        // [RxJSv5]
        /*
        return this._adalSubject.asObservable()
            .filter(message => message.type === type)
            .map(message => message.payload)
            .subscribe(callback);
        */
        // [RxJSv6]
        return this._adalSubject.asObservable()
            .pipe(filter(message => message.type === type))
            .pipe(map(message => message.payload))
            .subscribe(callback);
    }

}
