/* 
 * Copyright (c) 2011 Adam Rudd. 
 * See LICENSE for more information 
 */

var net = require('net')
  , MqttServer = require('./server').MqttServer
  , MqttSecureServer = require('./server').MqttSecureServer
  , MqttClient = require('./client')
  , MqttConnection = require('./connection')
  , tls = require("tls")
  , fs = require("fs");

var defaultPort = 1883
  , defaultHost = 'localhost';

/**
 * createClient - create an MQTT client
 *
 * @param {Number} [port] - broker port
 * @param {String} [host] - broker host
 * @param {Object} [opts] - see MqttClient#constructor
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

  if (opts && opts.clean === false && !opts.clientId) {
    throw new Error("Missing clientId for unclean clients");
  }

  net_client = net.createConnection(port, host);
  mqtt_client = new MqttClient(net_client, opts);

  mqtt_client._reconnect = function () {
    net_client.connect(port, host);
  };

  return mqtt_client;
};

/**
 * createSecureClient - create a tls secured MQTT client
 *
 * @param {Number} [port]
 * @param {String} [host]
 * @param {Object} opts
 * @api public
 */
module.exports.createSecureClient = function(port, host, opts) {
  var tls_client, mqtt_client, tls_opts = {};

  if ('object' === typeof port) {
    opts = port;
    port = defaultPort;
    host = defaultHost;
  } else if ('object' === typeof host) {
    opts = host;
    host = defaultHost;
  } else if ('object' !== typeof opts) {
    opts = {};
  }

  if (opts.keyPath && opts.certPath) {
    tls_opts.key = fs.readFileSync(opts.keyPath);
    tls_opts.cert = fs.readFileSync(opts.certPath);
  }

  tls_client = tls.connect(port, host, tls_opts);

  tls_client.on('secureConnect', function() {
    if (!tls_client.authorized) {
      throw new Error('TLS not authorized');
    }
  });

  mqtt_client = new MqttClient(tls_client, opts);
  return mqtt_client;
};

/**
 * createServer - create an MQTT server
 *
 * @param {Function} listener - called on new client connections
 */

module.exports.createServer = function(listener) {
  return new MqttServer(listener);
};

/**
 * createSecureServer - create a tls secured MQTT server
 *
 * @param {String} keyPath - path to private key
 * @param {String} certPath - path to public cert
 * @param {Function} listener - called on new client conns
 */

module.exports.createSecureServer =
function(keyPath, certPath, listener) {
  return new MqttSecureServer(keyPath, certPath, listener);
};

/**
 * createConnection - create a bare MQTT connection
 *
 * @param {Number} [port]
 * @param {String} [host]
 * @param {Function} [callback]
 */
module.exports.createConnection = function(port, host, callback) {
  var net_client, mqtt_conn;
  if ('undefined' === typeof port) {
    // createConnection();
    port = defaultPort;
    host = defaultHost;
    callback = function(){};
  } else if ('function' === typeof port) {
    // createConnection(function(){});
    callback = port;
    port = defaultPort;
    host = defaultHost;
  } else if ('function' === typeof host) {
    // createConnection(1883, function(){});
    callback = host;
    host = defaultHost;
  } else if ('function' !== typeof callback) {
    // createConnection(1883, 'localhost');
    callback = function(){};
  }

  net_client = net.createConnection(port, host);
  mqtt_conn = new MqttConnection(net_client);

  // Echo net errors
  mqtt_conn.stream.on('error', mqtt_conn.emit.bind(mqtt_conn, 'error'));
  mqtt_conn.stream.on('close', mqtt_conn.emit.bind(mqtt_conn, 'close'));

  net_client.on('connect', function() {
    mqtt_conn.emit('connected');
  });

  mqtt_conn.once('connected', function() {
    callback(null, mqtt_conn);
  });

  mqtt_conn.once('error', function(err) {
    callback(err);
  });

  return mqtt_conn;
};

// Expose MqttClient
module.exports.MqttClient = MqttClient;

// Expose servers
module.exports.MqttServer = MqttServer;
module.exports.MqttSecureServer = MqttSecureServer;

// Expose Connection
module.exports.MqttConnection = MqttConnection;
