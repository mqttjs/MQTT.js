
var websocket = require('websocket-stream');
var URL = require('url');

function buildBuilder(client, opts) {
  var host = opts.hostname || 'localhost'
    , port = String(opts.port || 80)
    , path = opts.path || '/'
    , url = opts.protocol + '://' + host + ':' + port + path
    , ws =  websocket(url, {
        protocol: 'mqttv3.1'
      });

  return ws;
}

function buildBuilderBrowser(mqttClient, opts) {
  var parsed = URL.parse(document.URL);

  if (!opts.protocol) {
    if (parsed.protocol === 'https:') {
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
    if (opts.protocol === "wss") {
      opts.port = 443;
    } else {
      opts.port = 80;
    }
  }

  if (!opts.path) {
    opts.path = parsed.pathname;
    if (!opts.path) {
      opts.path = '/';
    }
  }

  var host = opts.hostname || opts.host
    , port = String(opts.port)
    , url = opts.protocol + '://' + host + ':' + port + opts.path;

  return websocket(url, 'mqttv3.1');
}

if (process.title !== 'browser') {
  module.exports = buildBuilder;
} else {
  module.exports = buildBuilderBrowser;
}
