
var net = require('net');

function buildBuilder(client, opts) {
  opts.port     = opts.port || 1883;
  opts.hostname = opts.hostname || opts.host || 'localhost';

  var port = opts.port
    , host = opts.hostname;

  return net.createConnection(port, host);
}

module.exports = buildBuilder;

