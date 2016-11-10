'use strict'

var websocket = require('websocket-stream')
var _URL = require('url')
var wssProperties = [
  'rejectUnauthorized',
  'ca',
  'cert',
  'key',
  'pfx',
  'passphrase'
]

function buildBuilder (client, opts) {
  var wsOpt = {
    protocol: 'mqtt'
  }
  var host = opts.hostname || 'localhost'
  var path = opts.path || '/'

  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = 443
    } else {
      opts.port = 80
    }
  }

  var url = opts.protocol + '://' + host + ':' + opts.port + path

  if ((opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)) {
    wsOpt.protocol = 'mqttv3.1'
  }

  if (opts.protocol === 'wss') {
    wssProperties.forEach(function (prop) {
      if (opts.hasOwnProperty(prop)) {
        wsOpt[prop] = opts[prop]
      }
    })
  }

  return websocket(url, wsOpt)
}

function buildBuilderBrowser (mqttClient, opts) {
  var wsOpt = {
    protocol: 'mqtt'
  }
  var url
  var parsed

  // for Web Workers! P.S: typeof(document) !== undefined may be becoming the faster one these days.
  if (typeof (document) !== 'undefined') {
    parsed = _URL.parse(document.URL)
  } else {
    throw new Error('Could not determine host. Specify host manually.')
  }

  if (!opts.protocol) {
    if (parsed.protocol === 'https:') {
      opts.protocol = 'wss'
    } else {
      opts.protocol = 'ws'
    }
  }

  if (!opts.hostname) {
    opts.hostname = opts.host
  }

  if (!opts.hostname) {
    opts.hostname = parsed.hostname
    if (!opts.port) {
      opts.port = parsed.port
    }
  }

  if ((opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)) {
    wsOpt.protocol = 'mqttv3.1'
  }

  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = 443
    } else {
      opts.port = 80
    }
  }

  if (!opts.path) {
    opts.path = '/'
  }

  url = opts.protocol + '://' + opts.hostname + ':' + opts.port + opts.path

  return websocket(url, wsOpt)
}

if (process.title !== 'browser') {
  module.exports = buildBuilder
} else {
  module.exports = buildBuilderBrowser
}
