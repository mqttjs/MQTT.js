'use strict'
const net = require('net')
const debug = require('debug')('mqttjs:tcp')

/*
  variables port and host can be removed since
  you have all required information in opts object
*/
function streamBuilder (client, opts) {
  opts.port = opts.port || 1883
  opts.hostname = opts.hostname || opts.host || 'localhost'

  const port = opts.port
  const host = opts.hostname

  debug('port %d and host %s', port, host)
  return net.createConnection(port, host)
}

module.exports = streamBuilder
