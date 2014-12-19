/**
 * Requires
 */

var fs = require('fs')
  , net = require('net')
  , tls = require('tls')
  , util = require('util')
  , Connection = require('mqtt-connection');

function setupConnection(duplex) {
  var connection = new Connection(duplex);
  this.emit('client', connection);
}

/**
 * MqttServer
 *
 * @param {Function} listener - fired on client connection
 */
var MqttServer = module.exports.MqttServer =
function Server(listener) {
  if (!(this instanceof Server)) return new Server(listener);

  net.Server.call(this);

  this.on('connection', setupConnection);

  if (listener) {
    this.on('client', listener);
  }

  return this;
}
util.inherits(MqttServer, net.Server);

/**
 * MqttSecureServer
 *
 * @param {Object} opts - server options
 * @param {Function} listener
 */
var MqttSecureServer = module.exports.MqttSecureServer =
function SecureServer (opts, listener) {
  if (!(this instanceof SecureServer)) {
    return new SecureServer(opts, listener);
  }

  // new MqttSecureServer(function(){})
  if ('function' === typeof opts) {
    listener = opts;
    opts = {};
  }

  tls.Server.call(this, opts);

  if (listener) {
    this.on('client', listener);
  }

  this.on('secureConnection', setupConnection)

  return this;
}
util.inherits(MqttSecureServer, tls.Server);
