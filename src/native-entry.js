import {Capacitor, CapacitorHttp} from '@capacitor/core';
import {App} from '@capacitor/app';
import {Network} from '@capacitor/network';
import {configureNative} from './platform.js';

if (Capacitor.isNativePlatform()) configureNative({name: Capacitor.getPlatform(), http: CapacitorHttp,
  app: App, network: Network, defaultURL: __CYPER_SERVER_URL__, allowLocalHTTP: __CYPER_DEV_HTTP__});
await import('./app.js');
