/**
 * Requires
 */

var fs = require('fs')
  , net = require('net')
  , tls = require('tls')
  , util = require('util')
  , Connection = require('./connection');

function setConfig(config){
  config = config || {};

  this.config.parseProxyProtocol = !!config.parseProxyProtocol;

  return this;
}

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
    self.emit('client', new MqttServerClient(socket, self));
  });

  this.config = {};

  return this;
}
util.inherits(MqttServer, net.Server);

MqttServer.prototype.setConfig = setConfig;

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
      new MqttServerClient(clearTextStream, self));
  });

  this.config = {};

  return this;
}
util.inherits(MqttSecureServer, tls.Server);

MqttSecureServer.prototype.setConfig = setConfig;

/**
 * MqttServerClient - wrapper around Connection
 * Exists if we want to extend server functionality later
 *
 * @param {Stream} stream
 * @param {MqttServer} server
 */

var MqttServerClient = module.exports.MqttServerClient =
function MqttServerClient(stream, server) {
  Connection.call(this, stream, server);
  this.stream.on('error', this.emit.bind(this, 'error'));
  this.stream.on('close', this.emit.bind(this, 'close'));
};
util.inherits(MqttServerClient, Connection);
