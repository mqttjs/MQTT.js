/**
 * Module dependencies
 */
var Connection = require('./connection')
  , events = require('events')
  , util = require('util')
  , crypto = require('crypto');

/**
 * Default options
 */
var defaultConnectOptions = {
  keepalive: 10,
  protocolId: 'MQIsdp',
  protocolVersion: 3
};

var defaultId = function() {
  return 'mqttjs_' + crypto.randomBytes(8).toString('hex');
};

var nop = function(){};

/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
var MqttClient = module.exports = 
function MqttClient(stream, options) {
  var that = this;

  if (!this instanceof MqttClient) { 
    return new MqttClient(stream, options);
  }

  this.options = options || {};

  // Defaults
  for(var k in defaultConnectOptions) {
    if ('undefined' === typeof this.options[k]) {
      this.options[k] = defaultConnectOptions[k];
    } else {
      this.options[k] = options[k];
    }
  }
  this.options.clientId = this.options.clientId || defaultId();

  // MqttConnection
  this.conn = new Connection(stream);
  this.stream = this.conn.stream;

  // Next messageId
  this.nextId = 0;
  // Ping timer, setup in _setupPingTimer
  this.pingTimer = null;
  // Is the client connected?
  this.connected = false;
  // Packet queue
  this.queue = [];

  // Inflight messages
  this.inflight = {
    puback: {},
    pubrec: {},
    pubcomp: {},
    suback: {},
    unsuback: {}
  };

  // Incoming messages
  this.incoming = {
    pubrel: {}
  };

  // Send a connect packet on stream connect
  this.stream.on('connect', function () {
    that.conn.connect(that.options);
  });

  // Handle connack
  this.conn.on('connack', function (packet) {
    that._handleConnack(packet);
  });

  // Setup ping timer
  this.on('connect', this._setupPingTimer);

  // Send queued packets
  this.on('connect', function() {
    that.connected = true;

    var queue = that.queue
      , length = queue.length;

    for (var i = 0; i < length; i += 1) {
      that._sendPacket(
        queue[i].type,
        queue[i].packet,
        queue[i].cb
      );
    }
    that.queue = [];
  });

  // Handle incoming publish
  this.conn.on('publish', function (packet) {
    that._handlePublish(packet);
  });

  // one single handleAck function
  var handleAck = function (packet) {
    that._handleAck(packet);
  };

  // Handle incoming acks
  var acks = ['puback', 'pubrec', 'pubcomp', 'suback', 'unsuback'];
  
  acks.forEach(function (event) {
    that.conn.on(event, handleAck);
  });

  // Handle outgoing acks
  this.conn.on('pubrel', function (packet) {
    that._handlePubrel(packet);
  });

  // Echo errors
  this.conn.on('error', this.emit.bind(this, 'error'));
  this.stream.on('error', this.emit.bind(this, 'error'));

  // Clear ping timer on socket close
  this.stream.on('close', function () {
    that.connected = false;
    if (that.pingTimer !== null) {
      clearInterval(that.pingTimer);
      that.pingTimer = null;
    }
  });

  // Echo close
  this.stream.on('close', this.emit.bind(this, 'close'));

  // TODO: TEMPORARY
  // Swallow socket disconnected errors
  this.on('error', function(err) {
    if (err.message === 'This socket is closed.') {
      this.end();
    }
  });
    
  events.EventEmitter.call(this);
};
util.inherits(MqttClient, events.EventEmitter);

/**
 * publish - publish <message> to <topic>
 *
 * @param {String} topic - topic to publish to
 * @param {String, Buffer} message - message to publish
 * @param {Object} [opts] - publish options, includes:
 *    {Number} qos - qos level to publish on
 *    {Boolean} retain - whether or not to retain the message
 * @param {Function} [callback] - function(err){}
 *    called when publish succeeds or fails
 * @returns {MqttClient} this - for chaining
 * @api public
 *
 * @example client.publish('topic', 'message');
 * @example
 *     client.publish('topic', 'message', {qos: 1, retain: true});
 * @example client.publish('topic', 'message', console.log);
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

  this._sendPacket('publish', packet, function () {
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
  });

  return this;
};

/**
 * subscribe - subscribe to <topic>
 *
 * @param {String, Array} topic - topic(s) to subscribe to
 * @param {Object} [opts] - subscription options, includes:
 *    {Number} qos - subscribe qos level
 * @param {Function} [callback] - function(err, granted){} where:
 *    {Error} err - subscription error (none at the moment!)
 *    {Array} granted - array of {topic: 't', qos: 0}
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.subscribe('topic');
 * @example client.subscribe('topic', {qos: 1});
 * @example client.subscribe('topic', console.log);
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

  this._sendPacket('subscribe', packet, function () {
    this.inflight.suback[this.nextId++] = {
      callback: callback,
      packet: packet
    };
  });

  return this;
};

/**
 * unsubscribe - unsubscribe from topic(s)
 *
 * @param {String, Array} topic - topics to unsubscribe from
 * @param {Function} [callback] - callback fired on unsuback
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.unsubscribe('topic');
 * @example client.unsubscribe('topic', console.log);
 */
MqttClient.prototype.unsubscribe = function(topic, callback) {
  callback = callback || nop;
  var packet = {messageId: this.nextId};

  if ('string' === typeof topic) {
    packet.unsubscriptions = [topic];
  } else if ('object' === typeof topic && topic.length) {
    packet.unsubscriptions = topic;
  }

  this._sendPacket('unsubscribe', packet, function () {
    this.inflight.unsuback[this.nextId++] = callback;
  });

  return this;
};

/**
 * end - close connection
 *
 * @returns {MqttClient} this - for chaining
 * @api public
 */
MqttClient.prototype.end = function() {
  if (!this.connected) {
    this.once('connect', this._cleanUp.bind(this));
  } else {
    this._cleanUp();
  }

  return this;
};

/**
 * _cleanUp - clean up on connection end
 * @api private
 */

MqttClient.prototype._cleanUp = function() {
  this.conn.disconnect();
  this.stream.end();
  if (this.pingTimer !== null) {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
};

/**
 * _sendPacket - send or queue a packet
 * @param {String} type - packet type (see `protocol`)
 * @param {Object} packet - packet options
 * @param {Function} cb - callback when the packet is sent
 * @api private
 */

MqttClient.prototype._sendPacket = function(type, packet, cb) {
  if (this.connected) {
    this.conn[type](packet);
    if (cb) cb.call(this);
  } else {
    this.queue.push({type: type, packet: packet, cb: cb});
  }
};

/**
 * _setupPingTimer
 * 
 * @api private
 */
MqttClient.prototype._setupPingTimer = function() {
  // No ping
  if (this.options.keepalive === 0) {
    return;
  }
  var that = this;

  // Ping every half of the keepalive period
  this.pingTimer = setInterval((function () {
    that.conn.pingreq();
  }), this.options.keepalive * 600);
};

/**
 * _handleConnack 
 *
 * @param {Object} packet
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
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handlePublish = function(packet) {
  var topic = packet.topic
    , message = packet.payload
    , qos = packet.qos
    , mid = packet.messageId
    , retain = packet.retain;

  switch (qos) {
    case 0:
      this.emit('message', topic, message, packet);
      break;
    case 1:
      this.conn.puback({messageId: mid});
      this.emit('message', topic, message, packet);
      break;
    case 2:
      this.conn.pubrec({messageId: mid});
      this.incoming.pubrel[mid] = packet;
      break;
    default:
      break;
  }
};

/**
 * _handleAck
 *
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handleAck = function(packet) {
  var mid = packet.messageId
    , type = packet.cmd
    , cb = this.inflight[type][mid];

  // Check if callback exists
  if(!cb) return this.emit('error', new Error('Unknown message id')); 

  // Process
  switch (type) {
    case 'puback':
      // Callback - we're done
      cb();
      break;
    case 'pubrec':
      // Pubrel and add to pubcomp list
      this.conn.pubrel(packet);
      this.inflight.pubcomp[mid] = cb;
      break;
    case 'pubcomp':
      // Callback - we're done
      cb();
      break;
    case 'suback':
      // TODO: RIDICULOUS HACK, PLEASE FIX
      var origSubs = cb.packet.subscriptions
        , cb = cb.callback
        , granted = packet.granted;

      for (var i = 0; i < granted.length; i += 1) {
        origSubs[i].qos = granted[i];
      }
      cb(null, origSubs);
      break;
    case 'unsuback':
      cb();
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
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handlePubrel = function(packet) {
  var mid = packet.messageId
    , pub = this.incoming.pubrel[mid];

  if (!pub) this.emit('error', new Error('Unknown message id'));
  this.conn.pubcomp({messageId: mid});
  this.emit('message', pub.topic, pub.payload, pub);
};
