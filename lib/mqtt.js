/* 
 * Copyright (c) 2011 Adam Rudd. 
 * See LICENSE for more information 
 */

var net = require('net')
  , MqttServer = require('./server').MqttServer
  , MqttSecureServer = require('./server').MqttSecureServer
  , MqttClient = require('./client');

var defaultPort = 1883
  , defaultHost = 'localhost';

/**
 * createClient - create an MQTT client
 *
 * @param <Number> [port] - broker port
 * @param <String> [host] - broker host
 * @param <Object> [opts] - see MqttClient#constructor
 * @api public
 */
module.exports.createClient = function(port, host, opts) {
  var net_client, mqtt_client;

  if ('undefined' === typeof port) {
    // createClient()
    port = defaultPort;
    host = defaultHost;
    opts = {};
  } else if ('object' === typeof port) {
    // createClient({})
    opts = port;
    port = defaultPort;
    host = defaultHost;
  } else if ('object' === typeof host) {
    // createClient(1883, {})
    opts = host;
    host = defaultHost;
  }

  net_client = net.createConnection(port, host);
  mqtt_client = new MqttClient(net_client, opts);

  return mqtt_client;
};

/**
 * createSecureClient - create a tls secured MQTT client
 *
 * @param <Number> [port]
 * @param <String> [host]
 * @param <Object> opts
 * @api public
 */
module.exports.createSecureClient = function(port, host, opts) {
  var tls_client, mqtt_client;

  if ('object' === typeof port) {
    opts = port;
    port = defaultPort;
    host = defaultHost;
  } else if ('object' === typeof host) {
    opts = host;
    host = defaultHost;
  } else if ('object' !== typeof opts) {
    throw new Error('Invalid options');
  } 

  var keyPath = opts.keyPath
    , certPath = opts.certPath;

  tls_client = tls.connect(port, host, {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  });

  tls_client.on('secureConnect', function() {
    if (!tls_client.authorized) {
      throw new Error('TLS not authorized');
    }
  });

  mqtt_client = new MqttClient(tls_client, opts);
  return mqtt_client;
}

/**
 * createServer - create an MQTT server
 *
 * @param <Function> listener - called on new client connections
 */

module.exports.createServer = function(listener) {
  return new MqttServer(listener);
};

/**
 * createSecureServer - create a tls secured MQTT server
 *
 * @param <String> keyPath - path to private key
 * @param <String> certPath - path to public cert
 * @param <Function> listener - called on new client conns
 */

module.exports.createSecureServer =
function(keyPath, certPath, listener) {
  return new MqttSecureServer(keyPath, certPath, listener);
};


// Expose MqttClient
module.exports.MqttClient = MqttClient;

// Expose servers
module.exports.MqttServer = MqttServer;
module.exports.MqttSecureServer = MqttSecureServer;
