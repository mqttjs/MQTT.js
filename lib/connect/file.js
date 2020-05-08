'use strict'
var net = require('net')

function buildBuilder (client, opts) {
  return net.createConnection(opts.pathname)
}

module.exports = buildBuilder
