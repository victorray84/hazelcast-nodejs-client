/*
 * Copyright (c) 2008-2020, Hazelcast, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {EventEmitter} from 'events';
import {ImportConfig} from './config/ImportConfig';
import HazelcastClient from './HazelcastClient';
import * as Util from './Util';
import {ILogger} from './logging/ILogger';

/**
 * Lifecycle events.
 */
export let LifecycleEvent = {
    /**
     * events are emitted with this name.
     */
    name: 'lifecycleEvent',
    /**
     * From creation of client to connected state.
     */
    starting: 'starting',
    /**
     * Client is connected to cluster. Ready to use.
     */
    started: 'started',
    /**
     * Disconnect initiated.
     */
    shuttingDown: 'shuttingDown',
    /**
     * Disconnect completed gracefully.
     */
    shutdown: 'shutdown',
};

/**
 * LifecycleService
 */
export class LifecycleService extends EventEmitter {
    private active: boolean;
    private client: HazelcastClient;
    private logger: ILogger;

    constructor(client: HazelcastClient) {
        super();
        this.setMaxListeners(0);
        this.client = client;
        this.logger = this.client.getLoggingService().getLogger();
        const listeners = client.getConfig().listeners.lifecycle;
        listeners.forEach((listener) => {
            this.on(LifecycleEvent.name, listener);
        });
        const listenerConfigs = client.getConfig().listenerConfigs;
        listenerConfigs.forEach((importConfig: ImportConfig) => {
            const path = importConfig.path;
            const exportedName = importConfig.exportedName;
            const listener = Util.loadNameFromPath(path, exportedName);
            this.on(LifecycleEvent.name, listener);
        });
        this.emitLifecycleEvent(LifecycleEvent.starting);
    }

    /**
     * Causes LifecycleService to emit given event to all registered listeners.
     * @param state
     */
    emitLifecycleEvent(state: string): void {
        if (!LifecycleEvent.hasOwnProperty(state)) {
            throw new Error(state + ' is not a valid lifecycle event');
        }
        if (state === LifecycleEvent.started) {
            this.active = true;
        } else if (state === LifecycleEvent.shuttingDown) {
            this.active = false;
        }
        this.logger.info('LifecycleService', 'HazelcastClient is ' + state);
        this.emit(LifecycleEvent.name, state);
    }

    /**
     * Returns the active state of the client.
     * @returns {boolean}
     */
    isRunning(): boolean {
        return this.active;
    }
}
