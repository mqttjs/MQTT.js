'use strict';
var websocket = require('websocket-stream'),
  _URL = require('url');

function buildBuilder (client, opts) {
  var host = opts.hostname || 'localhost',
    port = opts.port || 80,
    url = opts.protocol + '://' + host + ':' + port,
    ws =  websocket(url, {
      protocol: 'mqttv3.1'
    });

  return ws;
}

function buildBuilderBrowser (mqttClient, opts) {
  var port, url,
    parsed = _URL.parse(document.URL),
    host = opts.hostname || opts.host;

  if (!opts.protocol) {
    if ('https:' === parsed.protocol) {
      opts.protocol = 'wss';
    } else {
      opts.protocol = 'ws';
    }
  }

  if (!opts.host) {
    opts.host = parsed.hostname;
    if (!opts.port) {
      opts.port = parsed.port;
    }
  }

  if (!opts.port) {
    if ('wss' === opts.protocol) {
      opts.port = 443;
    } else {
      opts.port = 80;
    }
  }

  port = opts.port;
  url = opts.protocol + '://' + host + ':' + opts.port;

  return websocket(url, 'mqttv3.1');
}

if (process.title !== 'browser') {
  module.exports = buildBuilder;
} else {
  module.exports = buildBuilderBrowser;
}
