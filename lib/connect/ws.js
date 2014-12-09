
var websocket = require('websocket-stream');

function buildBuilder(opts) {
  return function() {
    var host = opts.hostname || 'localhost'
      , port = opts.port || 80
      , url = opts.protocol + '://' + host + ':' + port
      , ws =  websocket(url, {
          protocol: 'mqttv3.1'
        });

    return ws;
  };
}

module.exports = buildBuilder;

