#!/usr/bin/env node
'use strict';
/*
 * Copyright (c) 2011 Adam Rudd.
 * See LICENSE for more information
 */

var MqttServer = require('./lib/server').MqttServer,
  MqttSecureServer = require('./lib/server').MqttSecureServer,
  MqttClient = require('./lib/client'),
  MqttConnection = require('mqtt-connection'),
  fs = require('fs'),
  connect = require('./lib/connect'),
  Store = require('./lib/store'),
  net = require('net'),
  defaultHost = 'localhost',
  defaultPort = 1883;

module.exports.connect = connect;

/**
 * createClient - create an MQTT client
 *
 * @param {Number} [port] - broker port
 * @param {String} [host] - broker host
 * @param {Object} [opts] - see MqttClient#constructor
 * @api public
 */
module.exports.createClient = function (port, host, opts) {
  console.warn('createClient is deprecated, use connect instead');

  if ('object' === typeof host) {
    opts = host;
    host = null;
  }

  opts = opts || {};
  opts.port = opts.port || port;
  opts.host = opts.host || host;
  opts.protocol = 'mqtt';

  return connect(opts);
};

/**
 * createSecureClient - create a tls secured MQTT client
 *
 * @param {Number} [port]
 * @param {String} [host]
 * @param {Object} opts
 * @api public
 */
module.exports.createSecureClient = function (port, host, opts) {
  var i;
  console.warn('createSecureClient is deprecated, use connect instead');

  if ('object' === typeof port) {
    opts = port;
    port = null;
    host = null;
  } else if ('object' === typeof host) {
    opts = host;
    host = null;
  } else if ('object' !== typeof opts) {
    opts = {};
  }

  opts.port = port;
  opts.host = host;
  opts.protocol = 'mqtts';

  if (opts.keyPath && opts.certPath) {
    opts.key = fs.readFileSync(opts.keyPath);
    opts.cert = fs.readFileSync(opts.certPath);
  }

  opts.ca = [];
  if (opts.caPaths) {
    for (i = 0; i < opts.caPaths.length; i++) {
      opts.ca[i] = fs.readFileSync(opts.caPaths[i]);
    }
  }

  return connect(opts);
};

/**
 * createServer - create an MQTT server
 *
 * @param {Function} listener - called on new client connections
 */

module.exports.createServer = function (listener) {
  console.warn('createServer() is deprecated, use http://npm.im/mqtt-connection or MqttServer instead');
  return new MqttServer(listener);
};

/**
 * createSecureServer - create a tls secured MQTT server
 *
 * @param {Object} opts - server options
 * - OR
 * @param {String} keyPath - path to private key
 * @param {String} certPath - path to public cert
 * @param {Function} [listener] - called on new client conns
 */
module.exports.createSecureServer =
function (keyPath, certPath, listener) {
  console.warn('createSecureServer() is deprecated, use http://npm.im/mqtt-connection or MqttSecureServer instead');
  var opts = {};

  // Deprecated style
  if ('string' === typeof keyPath && 'string' === typeof certPath) {
    opts.key = fs.readFileSync(keyPath);
    opts.cert = fs.readFileSync(certPath);
  } else if ('object' === typeof keyPath) {
    opts = keyPath;
    listener = certPath;
  }

  return new MqttSecureServer(opts, listener);
};

/**
 * createConnection - create a bare MQTT connection
 *
 * @param {Number} [port]
 * @param {String} [host]
 * @param {Function} [callback]
 */
module.exports.createConnection = function (port, host, callback) {
  console.warn('createConnection() is deprecated, use http://npm.im/mqtt-connection instead');
  var net_client, mqtt_conn;
  if ('undefined' === typeof port) {
    // createConnection();
    port = defaultPort;
    host = defaultHost;
    callback = function () {};
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
    callback = function () {};
  }

  net_client = net.createConnection(port, host);
  mqtt_conn = new MqttConnection(net_client);

  net_client.on('connect', function () {
    mqtt_conn.emit('connected');
  });

  mqtt_conn.once('connected', function () {
    callback(null, mqtt_conn);
  });

  mqtt_conn.once('error', function (err) {
    callback(err);
  });

  return mqtt_conn;
};

// Expose MqttClient
module.exports.MqttClient = MqttClient;
module.exports.Client = MqttClient;
module.exports.Store = Store;

// Expose servers
module.exports.Server = MqttServer;
module.exports.MqttServer = MqttServer;
module.exports.SecureServer = MqttSecureServer;
module.exports.MqttSecureServer = MqttSecureServer;

// Expose Connection
module.exports.MqttConnection = MqttConnection;

function cli () {
  var commist = require('commist')(),
    helpMe = require('help-me')();

  commist.register('publish', require('./bin/pub'));
  commist.register('subscribe', require('./bin/sub'));
  commist.register('version', function () {
    console.log('MQTT.js version:', require('./package.json').version);
  });
  commist.register('help', helpMe.toStdout);

  if (null !== commist.parse(process.argv.slice(2))) {
    console.log('No such command:', process.argv[2], '\n');
    helpMe.toStdout();
  }
}

if (require.main === module) {
  cli();
}
