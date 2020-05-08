'use strict'
var net = require('net')
var debug = require('debug')('mqttjs:file')

function buildBuilder (client, opts) {
  let pathname

  pathname = opts.pathname
  debug('pathname %s', opts.pathname)
  return net.createConnection(opts.pathname)
}

module.exports = buildBuilder
