'use strict';

import { StreamBuilderFunction } from './interface';
import { MqttClientOptions } from '../options';
import MqttClient from '../client';
import Store from '../store';
import { _IDuplex } from 'readable-stream';
import url from 'url';
import debugModule from 'debug';
const debug = debugModule('mqttjs');

const protocols: { [key: string]: StreamBuilderFunction } = {};

// eslint-disable-next-line camelcase
declare const __webpack_require__: any;

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

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {Object} [opts] option object
 */
function parseAuthOptions(opts: MqttClientOptions): void {
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
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
function connect(brokerUrlParam?: string | undefined | MqttClientOptions, optsParam?: MqttClientOptions | undefined) {
  debug('connecting to an MQTT broker...');
  let brokerUrl: string;
  let opts: MqttClientOptions;

  if (typeof brokerUrlParam === 'object' && !optsParam) {
    opts = brokerUrlParam;
    brokerUrl = '';
  } else {
    opts = optsParam || {};
    brokerUrl = (brokerUrlParam as string) || '';
  }

  if (brokerUrl) {
    const parsed: any = url.parse(brokerUrl, true) as any;
    if (parsed.port != undefined) {
      parsed.port = Number(parsed.port);
    }

    opts = { ...parsed, ...opts };

    if (opts.protocol == undefined) {
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
      if (['mqtts', 'wss', 'wxs', 'alis'].indexOf(opts.protocol) === -1) {
        switch (opts.protocol) {
          case 'mqtt':
            opts.protocol = 'mqtts';
            break;
          case 'ws':
            opts.protocol = 'wss';
            break;
          case 'wx':
            opts.protocol = 'wxs';
            break;
          case 'ali':
            opts.protocol = 'alis';
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
    opts.protocol = ['mqtt', 'mqtts', 'ws', 'wss', 'wx', 'wxs', 'ali', 'alis'].filter(function (key, index) {
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

  function wrapper(client: MqttClient): _IDuplex {
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

// TODO: This is very nodey. Do we need to redefine this interface?
module.exports = connect;
module.exports.connect = connect;
module.exports.MqttClient = MqttClient;
module.exports.Store = Store;
