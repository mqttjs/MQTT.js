
var net = require('net');

function buildBuilder(client, opts) {
  opts.port = opts.port || 1883;
  opts.host = opts.host || opts.hostname || 'localhost';

  var port = opts.port
    , host = opts.host;

  return net.createConnection(port, host);
}

module.exports = buildBuilder;

