'use strict';
/**
 * Requires
 */
var MqttServer, MqttSecureServer,
  net = require('net'),
  tls = require('tls'),
  util = require('util'),
  Connection = require('mqtt-connection');

/**
 * jshint comply here since using "this" in
 * a function that is not likely to be a method
 * breaks the strict rules
 * a solution will be to add the caller as parameter to it
 */
function setupConnection (duplex) {
  /*jshint validthis: true*/
  var connection = new Connection(duplex);
  this.emit('client', connection);
  /*jshint validthis: false*/
}



/**
 * MqttServer
 *
 * @param {Function} listener - fired on client connection
 */
MqttServer = module.exports.MqttServer = function Server (listener) {
  if (!(this instanceof Server)) {
    return new Server(listener);
  }

  net.Server.call(this);

  this.on('connection', setupConnection);

  if (listener) {
    this.on('client', listener);
  }

  return this;
};
util.inherits(MqttServer, net.Server);

/**
 * MqttSecureServer
 *
 * @param {Object} opts - server options
 * @param {Function} listener
 */
MqttSecureServer = module.exports.MqttSecureServer =
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

    this.on('secureConnection', setupConnection);

    return this;
  };
util.inherits(MqttSecureServer, tls.Server);
