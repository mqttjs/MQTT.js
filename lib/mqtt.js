/* 
 * Copyright (c) 2011 Adam Rudd. 
 * See LICENSE for more information 
 */

var net = require('net')
  , MqttServer = require('./server').MqttServer
  , MqttSecureServer = require('./server').MqttSecureServer
  , MqttClient = require('./client')
  , MqttConnection = require('./connection')
  , utils = require('./auth_utils')
  , tls = require("tls")
  , url = require('url')
  , fs = require("fs");

var defaultPort = 1883
  , defaultSslPort = 8883
  , defaultHost = 'localhost';

/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} brokerUrl - url of the broker
 * @param {Object} [opts] - see MqttClient#constructor
 */
module.exports.connect = function (brokerUrl, opts) {
  var host, port, auth, query;

  if ('undefined' === typeof brokerUrl) {
    throw new Error('Missing brokerUrl for connect method');
  }

  brokerUrl = url.parse(brokerUrl, true);

  host = brokerUrl.hostname;
  query = brokerUrl.query;

  opts = opts || {};

  // merge in the auth options if supplied
  utils.parseAuthOptions(brokerUrl.auth, opts);

  // support clientId passed in the query string of the url
  if('string' === typeof query.clientId) {
    opts.clientId = query.clientId;
  }

  if(brokerUrl.protocol.match(/(mqtt|tcp):/)) {
    port = brokerUrl.port || defaultPort;
    return exports.createClient(port, host, opts);
  }

  if(brokerUrl.protocol.match(/(mqtts|ssl):/)) {
    port = brokerUrl.port || defaultSslPort;
    return exports.createSecureClient(port, host, opts);
  }

  throw new Error('Unknown protocol - ' + brokerUrl.protocol);

};

/**
 * createClient - create an MQTT client
 *
 * @param {Number} [port] - broker port
 * @param {String} [host] - broker host
 * @param {Object} [opts] - see MqttClient#constructor
 * @api public
 */
module.exports.createClient = function(port, host, opts) {
  var builder, mqttClient;

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

  builder = function() {
    return net.createConnection(port, host);
  };

  mqttClient = new MqttClient(builder, opts);

  return mqttClient;
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
  var builder, mqttClient, tls_opts = {};

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

  if (opts && opts.clean === false && !opts.clientId) {
    throw new Error("Missing clientId for unclean clients");
  }

  if (opts.keyPath && opts.certPath) {
    tls_opts.key = fs.readFileSync(opts.keyPath);
    tls_opts.cert = fs.readFileSync(opts.certPath);
  }
  tls_opts.ca = [];
  if (opts.ca) {
    for (var i = 0;i<opts.ca.length;i++) {
      tls_opts.ca[i] = fs.readFileSync(opts.ca[i]);
    }
  }
  tls_opts.rejectUnauthorized = opts.rejectUnauthorized || false;

  tls_opts.port = port
  tls_opts.host = host

  builder = function() {
    var tls_client = tls.connect(tls_opts)

    tls_client.on('secureConnect', function() {
      if (tls_opts.rejectUnauthorized && !tls_client.authorized) {
        tls_client.emit('error', new Error('TLS not authorized'));
      } else {
        tls_client.removeListener('error', handleTLSerrors)
      }
    });

    function handleTLSerrors(err) {
      // How can I get verify this error is a tls error?
      if (tls_opts.rejectUnauthorized) {
        mqttClient.emit('error', err)
      }

      // close this connection to match the behaviour of net
      // otherwise all we get is an error from the tls_client
      // and close event doesn't fire. This is a work around
      // to enable the reconnect code to work the same as with
      // net.createConnection
      tls_client.end();
    }

    tls_client.on('error', handleTLSerrors)

    return tls_client;
  };

  mqttClient = new MqttClient(builder, opts);

  return mqttClient;
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
  mqtt_conn = net_client.pipe(new MqttConnection());

  // Echo net errors
  net_client.on('error', mqtt_conn.emit.bind(mqtt_conn, 'error'));

  net_client.on('close', mqtt_conn.emit.bind(mqtt_conn, 'close'));

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
