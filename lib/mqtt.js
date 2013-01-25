/* Copyright (c) 2011 Adam Rudd. See LICENSE for more information */

var net = require('net')
  , tls = require('tls')
  , fs = require('fs')
  , util = require('util');

var defaultHost = '127.0.0.1'
  , defaultPort = 1883;

var Connection = require('./connection');

var Server = module.exports.Server = function Server(listener) {
  if (!(this instanceof Server)) return new Server(listener);

  var self = this;

  net.Server.call(self);

  if (listener) {
    self.on('client', listener);
  }

  self.on('connection', function(socket) {
    self.emit('client', new Connection(socket, self));
  });

  return this;
}

var SecureServer = module.exports.SecureServer = function SecureServer(privateKeyPath, privateCertPath, listener) {
  if (!(this instanceof SecureServer)) return new SecureServer(listener);
  var self = this;
  tls.Server.call(self,{
    key: fs.readFileSync(privateKeyPath)
    , cert: fs.readFileSync(privateCertPath)
  });
  if (listener) {
    self.on('client', listener);
  }

  self.on('secureConnection', function(clearTextStream) {
    self.emit('client', new Connection(clearTextStream, self));
  });

  return this;
}

util.inherits(Server, net.Server);
util.inherits(SecureServer, tls.Server);

module.exports.createServer = function(listener) {
  return new Server(listener);
};
module.exports.createSecureServer = function(privateKeyPath, privateCertPath, listener) {
  return new SecureServer(privateKeyPath, privateCertPath, listener);
};

/* TODO: put some smarts in Client, rather than just having it wrap
 * Connection */
var Client = module.exports.Client = function Client(stream) {
  if (!(this instanceof Client)) return new Client(stream);
  return new Connection(stream, null);

}

module.exports.createClient = function(port, host, callback) {
  var host = host || defaultHost
    , port = port || defaultPort
    , callback = callback || function() {}
    , net_client, mqtt_client;

  if (typeof arguments[0] === 'function' && arguments.length === 1) {
    callback = arguments[0];
    port = defaultPort;
    host = defaultHost;
  }
  //validate this early on so we don't get hard to track errors later
  if (typeof callback !== 'function') throw new TypeError('callback is not a function');

  net_client = new net.Socket();

  mqtt_client = new Client(net_client, null);

  net_client.on('connect', function() {
    mqtt_client.emit('connected'); 
  });

  mqtt_client.on('connected', function() {
    callback(null, mqtt_client);
  });

  mqtt_client.on('error', function(err) {
    callback(err);
  });

  net_client.connect(port, host);

  return mqtt_client;
};

module.exports.createSecureClient = function(port, host, privateKeyPath, privateCertPath, callback) {
  var host = host || defaultHost
    , port = port || defaultPort
    , callback = callback || function() {}
    , tls_client, mqtt_client;

  if (typeof arguments[0] === 'function' && arguments.length === 1) {
    port = defaultPort;
    host = defaultHost;
    callback = arguments[0];
  }

  tls_client = tls.connect(port, host, {
    key: fs.readFileSync(privateKeyPath)
    , cert: fs.readFileSync(privateCertPath)
  }, function() {
    mqtt_client = new Client(tls_client, null);
    if ( tls_client.authorized ) {
      mqtt_client.emit("tls_authorized");
    } else {
      mqtt_client.emit("tls_not_authorized", tls_client.authorizationError);
    }
    mqtt_client.emit('connected');
    callback(null, mqtt_client);
    mqtt_client.on('error', function(err) {
      callback(err);
    });
  });
};
