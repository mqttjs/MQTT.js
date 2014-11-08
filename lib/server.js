/**
 * Requires
 */

var fs = require('fs')
  , net = require('net')
  , tls = require('tls')
  , util = require('util')
  , Connection = require('./connection');

/**
 * MqttServer
 *
 * @param {Function} listener - fired on client connection
 */
var MqttServer = module.exports.MqttServer = 
function Server(listener) {
  if (!(this instanceof Server)) return new Server(listener);

  var self = this;

  net.Server.call(self);

  if (listener) {
    self.on('client', listener);
  }

  self.on('connection', function(socket) {
    self.emit('client', new Connection(socket));
  });

  return this;
}
util.inherits(MqttServer, net.Server);

/**
 * MqttSecureServer
 *
 * @param {String} privateKeyPath
 * @param {String} publicCertPath
 * @param {Function} listener
 */
var MqttSecureServer = module.exports.MqttSecureServer = 
function SecureServer(keyPath, certPath, listener) {
  if (!(this instanceof SecureServer)) {
    return new SecureServer(listener);
  }
  var self = this;

  tls.Server.call(self, {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  });
  if (listener) {
    self.on('client', listener);
  }

  self.on('secureConnection', function(clearTextStream) {
    self.emit('client', 
      new Connection(clearTextStream));
  });

  return this;
}
util.inherits(MqttSecureServer, tls.Server);
