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
    suback: {}
  }

  // Incoming messages
  this.incoming = {
    pubrel: {}
  };

  // Send mqtt connect on net connect
  this.net_client.connect(port, host, function () {
    self.mqtt_conn.connect(options);
  });

  // Handle connack
  this.mqtt_conn.on('connack', this._handleConnack.bind(this));

  // Handle incoming publish
  this.mqtt_conn.on('publish', this._handlePublish.bind(this));

  // Handle incoming acks
  this.mqtt_conn.on('puback', this._handleAck.bind(this));
  this.mqtt_conn.on('pubrec', this._handleAck.bind(this));
  this.mqtt_conn.on('pubcomp', this._handleAck.bind(this));
  this.mqtt_conn.on('suback', this._handleAck.bind(this));

  // Handle outgoing acks
  this.mqtt_conn.on('pubrel', this._handlePubrel.bind(this));

  // Setup ping timer
  this._setupPingTimer();
    
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
 * @param <Function> [callback] - function(err){}
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
      callback();
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
 * @param <Function> [callback] - function(err){} fires on suback
 * @api public
 */
MqttClient.prototype.subscribe = 
function(topic, opts, callback) {
  var subs = [];

  // .subscribe('topic', callback)
  if ('function' === typeof opts) {
    callback = opts;
    opts = null;
  }

  // Defaults
  opts = opts || {qos: 0};
  callback = callback || nop;

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

  var packet = {
    subscriptions: subs,
    qos: 1,
    messageId: this.nextId,
    retain: false,
    dup: false
  };

  this.mqtt_conn.subscribe(packet);
  this.inflight.suback[this.nextId++] = callback;
};

/**
 * _setupPingTimer
 * 
 * @api private
 */

MqttClient.prototype._setupPingTimer = function() {
  this.pingTimer = setTimeout(function () {
    this.mqtt_conn.pingreq();
  }.bind(this), this.options.keepalive / 2);
};

/**
 * _handleConnack 
 *
 * @param <Object> packet
 * @api private
 */

MqttClient.prototype._handleConnack = function(packet) {
  var rc = packet.returnCode;

  // TODO: move to protocol
  var errors = [
    '',
    'Unacceptable protocol version',
    'Identifier rejected',
    'Server unavailable',
    'Bad username or password',
    'Not authorized'
  ];

  if (rc === 0) {
    this.emit('connect');
  } else if (rc > 0) {
    this.emit('error', 
        new Error('Connection refused: ' + errors[rc]));
  }
};

/**
 * _handlePublish
 *
 * @param <Object> packet
 * @api private
 */

MqttClient.prototype._handlePublish = function(packet) {
  var topic = packet.topic
    , message = packet.payload
    , qos = packet.qos
    , mid = packet.messageId;

  switch (qos) {
    case 0:
      this.emit('message', topic, message);
      break;
    case 1:
      this.mqtt_conn.puback({messageId: mid});
      this.emit('message', topic, message);
      break;
    case 2:
      this.mqtt_conn.pubrec({messageId: mid});
      this.incoming.pubrel[mid] = {topic: topic, message: message};
      break;
    default:
      break;
  }
};

/**
 * _handleAck
 *
 * @param <Object> packet
 * @api private
 */

MqttClient.prototype._handleAck = function(packet) {
  var mid = packet.messageId
    , type = packet.cmd
    , cb = this.inflight[type][mid];

  // Check if callback exists
  if(!cb) this.emit('error', new Error('Unknown message id'));

  // Process
  switch (type) {
    case 'puback':
      // Callback - we're done
      cb()
      break;
    case 'pubrec':
      // Pubrel and add to pubcomp list
      this.mqtt_conn.pubrel(packet);
      this.inflight.pubcomp[mid] = cb;
      break;
    case 'pubcomp':
      // Callback - we're done
      cb()
      break;
    case 'suback':
      cb()
      break;
    default:
      // code
  }

  // Remove from queue
  delete this.inflight[type][mid];
};

/**
 * _handlePubrel
 *
 * @param <Object> packet
 * @api private
 */

MqttClient.prototype._handlePubrel = function(packet) {
  var mid = packet.messageId
    , data = this.incoming.pubrel[mid];

  if (!data) this.emit('error', new Error('Unknown message id'));
  this.mqtt_conn.pubcomp({messageId: mid});
  this.emit('message', data.topic, data.message);
};
