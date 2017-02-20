'use strict'

import * as websocket from 'websocket-stream'
import * as urlModule from 'url'
import {MqttClient, ClientOptions} from '../client'

const WSS_OPTIONS = [
  'rejectUnauthorized',
  'ca',
  'cert',
  'key',
  'pfx',
  'passphrase'
]
const IS_BROWSER = process.title === 'browser'

function buildUrl (opts: ClientOptions, client: MqttClient) {
  let url = opts.protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts: ClientOptions) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = '' + 443
    } else {
      opts.port = '' + 80
    }
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
  if (!IS_BROWSER && opts.protocol === 'wss') {
    // Add cert/key/ca etc options
    WSS_OPTIONS.forEach(function (prop) {
      if (opts.hasOwnProperty(prop) && !opts.wsOptions.hasOwnProperty(prop)) {
        opts.wsOptions[prop] = (opts as any)[prop]
      }
    })
  }
}

function createWebSocket (client: MqttClient, opts: ClientOptions) {
  const websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)
  const url = buildUrl(opts, client)
  return websocket(url, [websocketSubProtocol], opts.wsOptions)
}

function buildBuilder (client: MqttClient, opts: ClientOptions) {
  return createWebSocket(client, opts)
}

function buildBuilderBrowser (client, opts) {
  if (!opts.hostname) {
    opts.hostname = opts.host
  }

  if (!opts.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof (document) === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.')
    }
    const parsed = urlModule.parse(document.URL)
    opts.hostname = parsed.hostname

    if (!opts.port) {
      opts.port = parsed.port
    }
  }
  return createWebSocket(client, opts)
}

export = buildBuilder
