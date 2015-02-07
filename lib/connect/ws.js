
var websocket = require('websocket-stream');
var URL = require('url');

function buildBuilder(client, opts) {
  var host = opts.hostname || 'localhost'
    , port = opts.port || 80
    , url = opts.protocol + '://' + host + ':' + port
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
  }

  if (!opts.port) {
    opts.port = parsed.port;
  }

  var host = opts.hostname || opts.host
    , port = opts.port
    , url = opts.protocol + '://' + host + ':' + opts.port

  return websocket(url);
}

if (process.title !== 'browser') {
  module.exports = buildBuilder;
} else {
  module.exports = buildBuilderBrowser;
}

