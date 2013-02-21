/**
 * Module dependencies
 */

var Connection = require('./connection')
  , events = require('events')
  , util = require('util')
  , crypto = require('crypto')
  , net = require('net');

/**
 * Defaults
 */

var defaultPort = 1883
  , defaultHost = 'localhost';

var defaultConnectOptions = {
  keepalive: 10000,
  client: 'mqttjs_' + crypto.randomBytes(16).toString('hex')
};

var nop = function(){};

/**
 * MqttClient constructor
 *
 * @param <Number> [port] - broker port
 * @param <String> [host] - broker hostname
 * @param <Object> [options] - connection options (see Connection#connect)
 */
var MqttClient = module.exports = 
function MqttClient(port, host, options) {
  if (!this instanceof MqttClient) { 
    return new MqttClient(port, host, options);
  }

  var self = this;

  if ('object' === typeof port) {
    // new MqttClient({client: asdf, keepalive:1234})
    options = port;
    port = defaultPort;
    host = defaultHost;
  } else if ('object' === typeof host) {
    // new MqttClient(1234, {client:asdf, keepalive:1234})
    options = host;
    host = defaultHost;
  }

  // Defaults
  this.options = options || defaultConnectOptions;

  this.net_client = new net.Socket();
  this.mqtt_conn = new Connection(this.net_client, null); 
  this.nextId = 0;

  // Inflight messages
  this.inflight = {
    puback: {},
    pubrec: {},
    pubcomp: {},
  }

  this.net_client.connect(port, host, function () {
    self.mqtt_conn.connect(options);
  });

  this.mqtt_conn.on('connack', function(packet) {
    var rc = packet.returnCode;

    if (rc === 0) {
      self.emit('connect');
    } else {
      // TODO: more informative
      self.emit('error', new Error('Connect error: ' + rc));
    }
  });

  this.mqtt_conn.on('puback', function (packet) {
    var mid = packet.messageId
      , cb = self.inflight.puback[mid];
    if (!cb) self.emit('error', new Error('Unknown message id'));
    // Fire callback
    cb(null, true);
    // Remove from callbacks
    delete self.inflight.puback[mid];
  });

  this.mqtt_conn.on('pubrec', function(packet) {
    var mid = packet.messageId
      , cb = self.inflight.pubrec[mid];
    if (!cb) self.emit('error', new Error('Unknown message id'));
    // Add to pubcomp callbacks
    self.inflight.pubcomp[mid] = cb;
    // Acknowledge receipt of pubrec
    self.mqtt_conn.pubrel(packet);
    // Remove from pubrec callbacks
    delete self.inflight.pubrec[mid];
  });

  this.mqtt_conn.on('pubcomp', function (packet) {
    var mid = packet.messageId
      , cb = self.inflight.pubcomp[mid];
    if (!cb) self.emit('error', new Error('Unknown message id'));
    // Fire callback
    cb(null, true);
    // Remove from callbacks
    delete self.inflight.puback[mid];
  });

  // Pingreq timer
  var pingreqTimer = setInterval(
      this.mqtt_conn.pingreq.bind(this.mqtt_conn),
      this.options.keepalive / 2
  );
    
  events.EventEmitter.call(this);
};
util.inherits(MqttClient, events.EventEmitter);

/**
 * publish - publish <message> to <topic>
 *
 * @param <String> topic - topic to publish to
 * @param <String, Buffer> message - message to publish
 * @param <Object> [opts] - publish options, includes:
 *    <Number> qos - qos level to publish on
 *    <Boolean> retain - whether or not to retain the message
 * @param <Function> [callback] - function(err, success){}
 *    called when publish succeeds or fails
 * @api public
 */
MqttClient.prototype.publish = 
function(topic, message, opts, callback) {
  var packet;

  // .publish(topic, payload, cb);
  if ('function' === typeof opts) {
    callback = opts;  
    opts = null;
  } 

  // Default opts
  if(!opts) opts = {qos: 0, retain: false};

  callback = callback || nop;

  packet = {
    topic: topic,
    payload: message,
    qos: opts.qos,
    retain: opts.retain,
    messageId: this.nextId
  }

  this.mqtt_conn.publish(packet);

  switch (opts.qos) {
    case 0:
      // Immediately callback
      callback(null, true);
      break;
    case 1:
      // Add to puback callbacks
      this.inflight.puback[this.nextId++] = callback;
      break;
    case 2:
      // Add to pubrec callbacks
      this.inflight.pubrec[this.nextId++] = callback;
      break
    default:
      break;
  }
};

/**
 * subscribe - subscribe to <topic>
 *
 * @param <String, Array> topic - topic(s) to subscribe to
 * @param <Object> [opts] - subscription options, includes:
 *    <Number> qos - subscribe qos level
 * @param <Function> [callback] - fires on suback
 * @api public
 */
MqttClient.prototype.subscribe = 
function(topic, opts, callback) {
  var subs = [];

  // Default opts
  opts = opts || {qos: 0};

  if ('string' === typeof topic) {
    subs.push({topic: topic, qos: opts.qos});
  } else if ('object' === typeof topic) {
    // TODO: harder array check
    for (var i = 0; i < topic.length; i += 1) {
      var t = topic[i];
      subs.push({topic: t, qos: opts.qos});
    }
  } else {
    // Error!
  }

  this.mqtt_conn.subscribe({subscriptions: subs});
};
