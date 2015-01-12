/**
 * Module dependencies
 */
var events        = require('events')
  , crypto        = require('crypto')
  , Store         = require('./store')
  , eos           = require('end-of-stream')
  , mqttPacket    = require('mqtt-packet')
  , Writable      = require('readable-stream').Writable
  , inherits      = require('inherits')
  , setImmediate  = global.setImmediate || function(callback) {
      // works in node v0.8
      process.nextTick(callback);
    };

/**
 * Default options
 */
var defaultConnectOptions = {
  keepalive: 10,
  protocolId: 'MQTT',
  protocolVersion: 4,
  reconnectPeriod: 1000,
  clean: true,
  encoding: 'utf8'
};

var defaultId = function() {
  return 'mqttjs_' + crypto.randomBytes(8).toString('hex');
};

function nop() {}

/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
var MqttClient = module.exports =
function MqttClient(streamBuilder, options) {
  var that = this;

  if (!(this instanceof MqttClient)) {
    return new MqttClient(streamBuilder, options);
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

  this.streamBuilder = streamBuilder;

  // Inflight message storages
  this.outgoingStore = this.options.outgoingStore || new Store();
  this.incomingStore = this.options.incomingStore || new Store();

  // Ping timer, setup in _setupPingTimer
  this.pingTimer = null;
  // Is the client connected?
  this.connected = false;
  // Packet queue
  this.queue = [];
  // Are we intentionally disconnecting?
  this.disconnecting = false;
  // Reconnect timer
  this.reconnectTimer = null;
  // MessageIDs starting with 1
  this.nextId = Math.floor(Math.random() * 65535);

  // Inflight callbacks
  this.outgoing = {}

  // Mark connected on connect
  this.on('connect', function() {
    this.connected = true;
  });

  // Mark disconnected on stream close
  this.on('close', function() {
    this.connected = false;
  });

  // Setup ping timer
  this.on('connect', this._setupPingTimer);

  // Send queued packets
  this.on('connect', function() {
    var queue = this.queue
      , length = queue.length;

    for (var i = 0; i < length; i += 1) {
      this._sendPacket(
        queue[i].packet,
        queue[i].cb
      );
    }
    this.queue = [];
  });


  // Clear ping timer
  this.on('close', function () {
    if (that.pingTimer !== null) {
      clearInterval(that.pingTimer);
      that.pingTimer = null;
    }
  });

  // Setup reconnect timer on disconnect
  this.on('close', this._setupReconnect);

  events.EventEmitter.call(this);

  this._setupStream();
};
inherits(MqttClient, events.EventEmitter);

/**
 * setup the event handlers in the inner stream.
 *
 * @api private
 */
MqttClient.prototype._setupStream = function() {
  var that = this;
  var writable = new Writable();
  var parser = mqttPacket.parser(this.options);
  var completeParse = null;
  var packets = [];

  this._clearReconnect();

  this.stream = this.streamBuilder(this);

  parser.on('packet', function(packet) {
    packets.push(packet);
  })

  function process() {
    var packet = packets.shift();
    var done = completeParse;
    if (packet) {
      that._handlePacket(packet, process);
    } else {
      completeParse = null;
      done();
    }
  }

  writable._write = function(buf, enc, done) {
    completeParse = done;
    parser.parse(buf);
    process();
  };

  this.stream.pipe(writable);

  // Suppress connection errors
  this.stream.on('error', nop)

  // Echo stream close
  eos(this.stream, this.emit.bind(this, 'close'));

  // Send a connect packet
  var connectPacket = Object.create(this.options);
  connectPacket.cmd = 'connect';
  // avoid message queue
  sendPacket(this, connectPacket);

  // Echo connection errors
  parser.on('error', this.emit.bind(this, 'error'));

  this.outgoingStore
    .createStream()
    .on('data', function(packet) {
      that._sendPacket(packet);
    })
    .on('error', this.emit.bind(this, 'error'));
};

MqttClient.prototype._handlePacket = function(packet, done) {
  switch (packet.cmd) {
    case 'publish':
      this._handlePublish(packet, done);
      break;
    case 'puback':
    case 'pubrec':
    case 'pubcomp':
    case 'suback':
    case 'unsuback':
      this._handleAck(packet);
      done();
      break;
    case 'pubrel':
      this._handlePubrel(packet, done);
      break;
    case 'connack':
      this._handleConnack(packet);
      done();
      break;
    case 'pingresp':
      this._handlePingresp(packet);
      done();
      break;
  }
};

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
    cmd: "publish",
    topic: topic,
    payload: message,
    qos: opts.qos,
    retain: opts.retain,
    messageId: this._nextId()
  };

  switch (opts.qos) {
    case 1:
    case 2:
      // Add to callbacks
      this.outgoing[packet.messageId] = callback;
      this._sendPacket(packet);
      break;
    default:
      this._sendPacket(packet, callback);
      break;
  }

  return this;
};

/**
 * subscribe - subscribe to <topic>
 *
 * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
 * @param {Object} [opts] - optional subscription options, includes:
 *    {Number} qos - subscribe qos level
 * @param {Function} [callback] - function(err, granted){} where:
 *    {Error} err - subscription error (none at the moment!)
 *    {Array} granted - array of {topic: 't', qos: 0}
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.subscribe('topic');
 * @example client.subscribe('topic', {qos: 1});
 * @example client.subscribe({'topic': 0, 'topic2': 1}, console.log);
 * @example client.subscribe('topic', console.log);
 */
MqttClient.prototype.subscribe =
function() {
  var args = Array.prototype.slice.call(arguments)
    , subs = [];

  var obj = args.shift()
    , callback = args.pop() || nop
    , opts = args.pop();

  if (typeof obj === 'string') {
    obj = [obj];
  }

  if (typeof callback !== 'function') {
    opts = callback;
    callback = nop;
  }

  if (!opts) {
    opts = { qos: 0 };
  }

  if (Array.isArray(obj)) {
    obj.forEach(function(topic) {
      subs.push({
        topic: topic,
        qos: opts.qos
      });
    });
  } else {
    Object
      .keys(obj)
      .forEach(function(k) {
        subs.push({
          topic: k,
          qos: obj[k]
        });
      });
  }

  var packet = {
    cmd: "subscribe",
    subscriptions: subs,
    qos: 1,
    retain: false,
    dup: false,
    messageId: this._nextId()
  };

  this.outgoing[packet.messageId] = callback;

  this._sendPacket(packet);

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
  var packet = {
    cmd: "unsubscribe",
    qos: 1,
    messageId: this._nextId()
  };

  if ('string' === typeof topic) {
    packet.unsubscriptions = [topic];
  } else if ('object' === typeof topic && topic.length) {
    packet.unsubscriptions = topic;
  }

  this.outgoing[packet.messageId] = callback;

  this._sendPacket(packet);

  return this;
};

/**
 * end - close connection
 *
 * @returns {MqttClient} this - for chaining
 * @api public
 */
MqttClient.prototype.end = function(cb) {
  var that = this;

  function closeStores() {
    that.incomingStore.close(function() {
      that.outgoingStore.close(cb);
    });
  }

  if (!this.connected) {
    this.once('connect', this._cleanUp.bind(this));
    this.once('connect', closeStores);
  } else {
    this._cleanUp();
    closeStores();
  }

  this.disconnecting = true;

  return this;
};

/**
 * _reconnect - implement reconnection
 * @api privateish
 */
MqttClient.prototype._reconnect = function() {
  this.emit('reconnect');
  this._setupStream();
};

/**
 * _setupReconnect - setup reconnect timer
 */
MqttClient.prototype._setupReconnect = function() {
  var that = this;

  if (!that.disconnecting && !that.reconnectTimer && (that.options.reconnectPeriod > 0)) {
    this.emit('offline');
    that.reconnectTimer = setInterval(function () {
      that._reconnect();
    }, that.options.reconnectPeriod);
  }
};

/**
 * _clearReconnect - clear the reconnect timer
 */
MqttClient.prototype._clearReconnect = function() {
  if (this.reconnectTimer) {
    clearInterval(this.reconnectTimer);
    this.reconnectTimer = false;
  }
};


/**
 * _cleanUp - clean up on connection end
 * @api private
 */
MqttClient.prototype._cleanUp = function(forced) {
  if (forced) {
    this.stream.destroy();
  } else {
    this._sendPacket({ cmd: "disconnect" });
    this.stream.end();
  }

  this._clearReconnect();

  if (this.pingTimer !== null) {
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }
};


function sendPacket(client, packet, cb) {
  try {
    var buf = mqttPacket.generate(packet);
    if (!client.stream.write(buf) && cb) {
      client.stream.once('drain', cb);
    } else if (cb) {
      cb();
    }
  } catch(err) {
    if (cb) {
      cb(err);
    } else {
      client.emit('error', err);
    }
  }
}

function storeAndSend(client, packet, cb) {
  client.outgoingStore.put(packet, function storedPacket(err) {
    if (err) {
      return cb && cb(err);
    }
    sendPacket(client, packet, cb);
  })
}

/**
 * _sendPacket - send or queue a packet
 * @param {String} type - packet type (see `protocol`)
 * @param {Object} packet - packet options
 * @param {Function} cb - callback when the packet is sent
 * @api private
 */
MqttClient.prototype._sendPacket = function(packet, cb) {
  if (!this.connected) {
    return this.queue.push({ packet: packet, cb: cb });
  }

  switch (packet.qos) {
    case 2:
    case 1:
      storeAndSend(this, packet, cb);
      break;
    case 0:
    default:
      sendPacket(this, packet, cb);
      break;
  }
};

/**
 * _setupPingTimer - setup the ping timer
 *
 * @api private
 */
MqttClient.prototype._setupPingTimer = function() {
  var that = this;

  if (!this.pingTimer && this.options.keepalive) {
    this.pingResp = true;
    this.pingTimer = setInterval(function () {
        that._checkPing();
    }, this.options.keepalive * 1000);
  }
};

/**
 * _checkPing - check if a pingresp has come back, and ping the server again
 *
 * @api private
 */
MqttClient.prototype._checkPing = function () {
  if (this.pingResp) {
    this.pingResp = false;
    this._sendPacket({ cmd: "pingreq" });
  } else {
    // do a forced cleanup since socket will be in bad shape
    this._cleanUp(true);
  }
};

/**
 * _handlePingresp - handle a pingresp
 *
 * @api private
 */
MqttClient.prototype._handlePingresp = function () {
  this.pingResp = true;
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

MqttClient.prototype._handlePublish = function(packet, done) {
  var topic = packet.topic.toString()
    , message = packet.payload
    , qos = packet.qos
    , mid = packet.messageId
    , that = this;

  switch (qos) {
    case 2:
      this.incomingStore.put(packet, function() {
        that._sendPacket({cmd: "pubrec", messageId: mid}, done);
      })
      break;
    case 1:
      // do not wait sending a puback
      // no callback passed
      this._sendPacket({
        cmd: "puback",
        messageId: mid
      });
    case 0:
      // emit the message event for both qos 1 and 0
      this.emit('message', topic, message, packet);
      this.handleMessage(packet, done);
  }
};

/**
 * Handle messages with backpressure support, one at a time.
 * Override at will.
 *
 * @param Packet packet the packet
 * @param Function callback call when finished
 * @api public
 */
MqttClient.prototype.handleMessage = function(packet, callback) {
  callback();
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
    , response = null
    , cb = this.outgoing[mid]
    , that = this;

  if (!cb) {
    // Server sent an ack in error, ignore it.
    return;
  }

  // Process
  switch (type) {
    case 'pubcomp':
      // same thing as puback for QoS 2
    case 'puback':
      // Callback - we're done
      delete this.outgoing[mid];
      this.outgoingStore.del(packet, cb);
      break;
    case 'pubrec':
      response = {
        cmd: "pubrel",
        qos: 2,
        messageId: mid
      }

      this._sendPacket(response)
      break;
    case 'suback':
      delete this.outgoing[mid];
      this.outgoingStore.del(packet, function(err, original) {
        if (err) {
          // missing packet, what should we do?
          return that.emit('error', err);
        }

        var origSubs = original.subscriptions
          , granted = packet.granted;

        for (var i = 0; i < granted.length; i += 1) {
          origSubs[i].qos = granted[i];
        }

        cb(null, origSubs);
      })
      break;
    case 'unsuback':
      delete this.outgoing[mid];
      this.outgoingStore.del(packet, cb);
      break;
    default:
      // code
  }
};

/**
 * _handlePubrel
 *
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handlePubrel = function(packet) {
  var mid = packet.messageId
    , that = this;

  that.incomingStore.get(packet, function(err, pub) {
    if (err) return that.emit('error', err);

    if (pub.cmd !== "pubrel") {
      that.emit('message', pub.topic, pub.payload, pub);
      that.incomingStore.put(packet);
    }

    that._sendPacket({cmd: "pubcomp", messageId: mid});
  });
};

/**
 * _nextId
 */
MqttClient.prototype._nextId = function() {
  var id = this.nextId++;
  // Ensure 16 bit unsigned int:
  if (id === 65535) {
    this.nextId = 1;
  }
  return id;
};
