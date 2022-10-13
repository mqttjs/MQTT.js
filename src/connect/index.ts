'use strict';

import { IClientOptions } from '../client-options';
import { MqttClient } from '../client';
import url from 'url';
import debugModule from 'debug';
const debug = debugModule('mqttjs');
import events from 'events';

// eslint-disable-next-line camelcase
declare const __webpack_require__: any;

export type StreamBuilder = (client: MqttClient, opts: IClientOptions) => IStream;

const protocols: { [key: string]: StreamBuilder } = {};

// eslint-disable-next-line camelcase
if ((typeof process !== 'undefined' && process.title !== 'browser') || typeof __webpack_require__ !== 'function') {
  protocols['mqtt'] = require('./tcp');
  protocols['tcp'] = require('./tcp');
  protocols['ssl'] = require('./tls');
  protocols['tls'] = require('./tls');
  protocols['mqtts'] = require('./tls');
}

protocols['ws'] = require('./ws');
protocols['wss'] = require('./ws');

export interface IStream extends events.EventEmitter {
  pipe(to: any): any;
  destroy(): any;
  end(): any;
}

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {IClientOptions} [opts] option object
 */
function parseAuthOptions(opts: IClientOptions): void {
  let matches;
  if (opts.auth) {
    matches = opts.auth.match(/^(.+):(.+)$/);
    if (matches) {
      opts.username = matches[1];
      opts.password = matches[2];
    } else {
      opts.username = opts.auth;
    }
  }
}

/**
 * connect - connect to an MQTT broker.
 *
 * @param {IClientOptions} opts - see MqttClient#constructor
 */
export function connect(opts: IClientOptions): MqttClient;
/**
 * connect - connect to an MQTT broker.
 *
 * @param {string} brokerUrl - url of the broker
 * @param {IClientOptions} opts - see MqttClient#constructor
 */
// eslint-disable-next-line no-redeclare
export function connect(brokerUrl: string, opts?: IClientOptions): MqttClient;

// eslint-disable-next-line no-redeclare
export function connect(brokerUrlParam?: string | undefined | IClientOptions, optsParam?: IClientOptions | undefined) {
  debug('connecting to an MQTT broker...');
  let brokerUrl: string;
  let opts: IClientOptions;

  if (typeof brokerUrlParam === 'object' && !optsParam) {
    opts = brokerUrlParam;
    brokerUrl = '';
  } else {
    opts = optsParam || {};
    brokerUrl = (brokerUrlParam as string) || '';
  }

  if (brokerUrl) {
    const parsed: any = url.parse(brokerUrl, true) as any;
    if (parsed.port != null) {
      parsed.port = Number(parsed.port);
    }

    opts = { ...parsed, ...opts };

    if (opts.protocol == null) {
      throw new Error('Missing protocol');
    }

    opts.protocol = opts.protocol!.replace(/:$/, '');
  }

  // merge in the auth options if supplied
  parseAuthOptions(opts);

  // support clientId passed in the query string of the url
  if (opts.query && typeof opts.query['clientId'] === 'string') {
    opts.clientId = opts.query['clientId'];
  }

  if (opts.cert && opts.key) {
    if (opts.protocol) {
      if (['mqtts', 'wss'].indexOf(opts.protocol) === -1) {
        switch (opts.protocol) {
          case 'mqtt':
            opts.protocol = 'mqtts';
            break;
          case 'ws':
            opts.protocol = 'wss';
            break;
          default:
            throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!');
        }
      }
    } else {
      // A cert and key was provided, however no protocol was specified, so we will throw an error.
      throw new Error('Missing secure protocol key');
    }
  }

  if (!protocols[opts.protocol as string]) {
    const isSecure = ['mqtts', 'wss'].indexOf(opts.protocol as string) !== -1;
    opts.protocol = ['mqtt', 'mqtts', 'ws', 'wss'].filter(function (key, index) {
      if (isSecure && index % 2 === 0) {
        // Skip insecure protocols when requesting a secure one.
        return false;
      }
      return typeof protocols[key] === 'function';
    })[0];
  }

  if (opts.clean === false && !opts.clientId) {
    throw new Error('Missing clientId for unclean clients');
  }

  if (opts.protocol) {
    opts.defaultProtocol = opts.protocol;
  }

  function wrapper(client: MqttClient): IStream {
    // TODO: this is a crazy way to do server list.
    if (opts.servers) {
      if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
        client._reconnectCount = 0;
      }

      opts.host = opts.servers[client._reconnectCount]!.host;
      opts.port = opts.servers[client._reconnectCount]!.port;
      opts.protocol = !opts.servers[client._reconnectCount]!.protocol
        ? opts.defaultProtocol
        : opts.servers![client._reconnectCount]!.protocol;
      opts.hostname = opts.host;

      client._reconnectCount++;
    }

    debug('calling streambuilder for', opts.protocol);
    return protocols[opts.protocol as string]!(client, opts);
  }
  const client = new MqttClient(wrapper, opts);
  client.on('error', function () {
    /* Automatically set up client error handling */
  });
  return client;
}

export { MqttClient };
