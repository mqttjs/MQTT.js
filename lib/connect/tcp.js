'use strict'
var net = require('net')

/*
  variables port and host can be removed since
  you have all required information in opts object
*/
function buildBuilder (client, opts) {
  var port, host
  opts.port = opts.port || 1883
  opts.host = opts.host || 'localhost'

  port = opts.port
  host = opts.host

  return net.createConnection(port, host)
}

module.exports = buildBuilder
