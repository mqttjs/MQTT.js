'use strict'

/**
 * Module dependencies
 */
const EventEmitter = require('events').EventEmitter
const Store = require('./store')
const TopicAliasRecv = require('./topic-alias-recv')
const TopicAliasSend = require('./topic-alias-send')
const mqttPacket = require('mqtt-packet')
const DefaultMessageIdProvider = require('./default-message-id-provider')
const Writable = require('readable-stream').Writable
const inherits = require('inherits')
const reInterval = require('reinterval')
const clone = require('rfdc/default')
const validations = require('./validations')
const xtend = require('xtend')
const debug = require('debug')('mqttjs:client')
const nextTick = process ? process.nextTick : function (callback) { setTimeout(callback, 0) }
const setImmediate = global.setImmediate || function (callback) {
  // works in node v0.8
  nextTick(callback)
}
const defaultConnectOptions = {
  keepalive: 60,
  reschedulePings: true,
  protocolId: 'MQTT',
  protocolVersion: 4,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
  resubscribe: true
}


const errors = {
  0: '',
  1: 'Unacceptable protocol version',
  2: 'Identifier rejected',
  3: 'Server unavailable',
  4: 'Bad username or password',
  5: 'Not authorized',
  16: 'No matching subscribers',
  17: 'No subscription existed',
  128: 'Unspecified error',
  129: 'Malformed Packet',
  130: 'Protocol Error',
  131: 'Implementation specific error',
  132: 'Unsupported Protocol Version',
  133: 'Client Identifier not valid',
  134: 'Bad User Name or Password',
  135: 'Not authorized',
  136: 'Server unavailable',
  137: 'Server busy',
  138: 'Banned',
  139: 'Server shutting down',
  140: 'Bad authentication method',
  141: 'Keep Alive timeout',
  142: 'Session taken over',
  143: 'Topic Filter invalid',
  144: 'Topic Name invalid',
  145: 'Packet identifier in use',
  146: 'Packet Identifier not found',
  147: 'Receive Maximum exceeded',
  148: 'Topic Alias invalid',
  149: 'Packet too large',
  150: 'Message rate too high',
  151: 'Quota exceeded',
  152: 'Administrative action',
  153: 'Payload format invalid',
  154: 'Retain not supported',
  155: 'QoS not supported',
  156: 'Use another server',
  157: 'Server moved',
  158: 'Shared Subscriptions not supported',
  159: 'Connection rate exceeded',
  160: 'Maximum connect time',
  161: 'Subscription Identifiers not supported',
  162: 'Wildcard Subscriptions not supported'
}

function defaultId () {
  return 'mqttjs_' + Math.random().toString(16).substr(2, 8)
}

function applyTopicAlias (client, packet) {
  if (client.options.protocolVersion === 5) {
    if (packet.cmd === 'publish') {
      let alias
      if (packet.properties) {
        alias = packet.properties.topicAlias
      }
      const topic = packet.topic.toString()
      if (client.topicAliasSend) {
        if (alias) {
          if (topic.length !== 0) {
            // register topic alias
            debug('applyTopicAlias :: register topic: %s - alias: %d', topic, alias)
            if (!client.topicAliasSend.put(topic, alias)) {
              debug('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
              return new Error('Sending Topic Alias out of range')
            }
          }
        } else {
          if (topic.length !== 0) {
            if (client.options.autoAssignTopicAlias) {
              alias = client.topicAliasSend.getAliasByTopic(topic)
              if (alias) {
                packet.topic = ''
                packet.properties = { ...(packet.properties), topicAlias: alias }
                debug('applyTopicAlias :: auto assign(use) topic: %s - alias: %d', topic, alias)
              } else {
                alias = client.topicAliasSend.getLruAlias()
                client.topicAliasSend.put(topic, alias)
                packet.properties = { ...(packet.properties), topicAlias: alias }
                debug('applyTopicAlias :: auto assign topic: %s - alias: %d', topic, alias)
              }
            } else if (client.options.autoUseTopicAlias) {
              alias = client.topicAliasSend.getAliasByTopic(topic)
              if (alias) {
                packet.topic = ''
                packet.properties = { ...(packet.properties), topicAlias: alias }
                debug('applyTopicAlias :: auto use topic: %s - alias: %d', topic, alias)
              }
            }
          }
        }
      } else if (alias) {
        debug('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
        return new Error('Sending Topic Alias out of range')
      }
    }
  }
}

function removeTopicAliasAndRecoverTopicName (client, packet) {
  let alias
  if (packet.properties) {
    alias = packet.properties.topicAlias
  }

  let topic = packet.topic.toString()
  if (topic.length === 0) {
    // restore topic from alias
    if (typeof alias === 'undefined') {
      return new Error('Unregistered Topic Alias')
    } else {
      topic = client.topicAliasSend.getTopicByAlias(alias)
      if (typeof topic === 'undefined') {
        return new Error('Unregistered Topic Alias')
      } else {
        packet.topic = topic
      }
    }
  }
  if (alias) {
    delete packet.properties.topicAlias
  }
}

function sendPacket (client, packet, cb) {
  debug('sendPacket :: packet: %O', packet)
  debug('sendPacket :: emitting `packetsend`')

  client.emit('packetsend', packet)

  debug('sendPacket :: writing to stream')
  const result = mqttPacket.writeToStream(packet, client.stream, client.options)
  debug('sendPacket :: writeToStream result %s', result)
  if (!result && cb && cb !== nop) {
    debug('sendPacket :: handle events on `drain` once through callback.')
    client.stream.once('drain', cb)
  } else if (cb) {
    debug('sendPacket :: invoking cb')
    cb()
  }
}

function flush (queue) {
  if (queue) {
    debug('flush: queue exists? %b', !!(queue))
    Object.keys(queue).forEach(function (messageId) {
      if (typeof queue[messageId].cb === 'function') {
        queue[messageId].cb(new Error('Connection closed'))
        // This is suspicious.  Why do we only delete this if we have a callbck?
        // If this is by-design, then adding no as callback would cause this to get deleted unintentionally.
        delete queue[messageId]
      }
    })
  }
}

function flushVolatile (queue) {
  if (queue) {
    debug('flushVolatile :: deleting volatile messages from the queue and setting their callbacks as error function')
    Object.keys(queue).forEach(function (messageId) {
      if (queue[messageId].volatile && typeof queue[messageId].cb === 'function') {
        queue[messageId].cb(new Error('Connection closed'))
        delete queue[messageId]
      }
    })
  }
}

function storeAndSend (client, packet, cb, cbStorePut) {
  debug('storeAndSend :: store packet with cmd %s to outgoingStore', packet.cmd)
  let storePacket = packet
  let err
  if (storePacket.cmd === 'publish') {
    // The original packet is for sending.
    // The cloned storePacket is for storing to resend on reconnect.
    // Topic Alias must not be used after disconnected.
    storePacket = clone(packet)
    err = removeTopicAliasAndRecoverTopicName(client, storePacket)
    if (err) {
      return cb && cb(err)
    }
  }
  client.outgoingStore.put(storePacket, function storedPacket (err) {
    if (err) {
      return cb && cb(err)
    }
    cbStorePut()
    sendPacket(client, packet, cb)
  })
}

function nop (error) {
  debug('nop ::', error)
}

/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
function MqttClient (streamBuilder, options) {
  let k
  const that = this

  if (!(this instanceof MqttClient)) {
    return new MqttClient(streamBuilder, options)
  }

  this.options = options || {}

  // Defaults
  for (k in defaultConnectOptions) {
    if (typeof this.options[k] === 'undefined') {
      this.options[k] = defaultConnectOptions[k]
    } else {
      this.options[k] = options[k]
    }
  }

  debug('MqttClient :: options.protocol', options.protocol)
  debug('MqttClient :: options.protocolVersion', options.protocolVersion)
  debug('MqttClient :: options.username', options.username)
  debug('MqttClient :: options.keepalive', options.keepalive)
  debug('MqttClient :: options.reconnectPeriod', options.reconnectPeriod)
  debug('MqttClient :: options.rejectUnauthorized', options.rejectUnauthorized)
  debug('MqttClient :: options.topicAliasMaximum', options.topicAliasMaximum)

  this.options.clientId = (typeof options.clientId === 'string') ? options.clientId : defaultId()

  debug('MqttClient :: clientId', this.options.clientId)

  this.options.customHandleAcks = (options.protocolVersion === 5 && options.customHandleAcks) ? options.customHandleAcks : function () { arguments[3](0) }

  this.streamBuilder = streamBuilder

  this.messageIdProvider = (typeof this.options.messageIdProvider === 'undefined') ? new DefaultMessageIdProvider() : this.options.messageIdProvider

  // Inflight message storages
  this.outgoingStore = options.outgoingStore || new Store()
  this.incomingStore = options.incomingStore || new Store()

  // Should QoS zero messages be queued when the connection is broken?
  this.queueQoSZero = options.queueQoSZero === undefined ? true : options.queueQoSZero

  // map of subscribed topics to support reconnection
  this._resubscribeTopics = {}

  // map of a subscribe messageId and a topic
  this.messageIdToTopic = {}

  // Ping timer, setup in _setupPingTimer
  this.pingTimer = null
  // Is the client connected?
  this.connected = false
  // Are we disconnecting?
  this.disconnecting = false
  // Packet queue
  this.queue = []
  // connack timer
  this.connackTimer = null
  // Reconnect timer
  this.reconnectTimer = null
  // Is processing store?
  this._storeProcessing = false
  // Packet Ids are put into the store during store processing
  this._packetIdsDuringStoreProcessing = {}
  // Store processing queue
  this._storeProcessingQueue = []

  // Inflight callbacks
  this.outgoing = {}

  // True if connection is first time.
  this._firstConnection = true

  if (options.topicAliasMaximum > 0) {
    if (options.topicAliasMaximum > 0xffff) {
      debug('MqttClient :: options.topicAliasMaximum is out of range')
    } else {
      this.topicAliasRecv = new TopicAliasRecv(options.topicAliasMaximum)
    }
  }

  // Send queued packets
  this.on('connect', function () {
    const queue = this.queue

    function deliver () {
      const entry = queue.shift()
      debug('deliver :: entry %o', entry)
      let packet = null

      if (!entry) {
        that._resubscribe()
        return
      }

      packet = entry.packet
      debug('deliver :: call _sendPacket for %o', packet)
      let send = true
      if (packet.messageId && packet.messageId !== 0) {
        if (!that.messageIdProvider.register(packet.messageId)) {
          send = false
        }
      }
      if (send) {
        that._sendPacket(
          packet,
          function (err) {
            if (entry.cb) {
              entry.cb(err)
            }
            deliver()
          }
        )
      } else {
        debug('messageId: %d has already used. The message is skipped and removed.', packet.messageId)
        deliver()
      }
    }

    debug('connect :: sending queued packets')
    deliver()
  })

  this.on('close', function () {
    debug('close :: connected set to `false`')
    this.connected = false

    debug('close :: clearing connackTimer')
    clearTimeout(this.connackTimer)

    debug('close :: clearing ping timer')
    if (that.pingTimer !== null) {
      that.pingTimer.clear()
      that.pingTimer = null
    }

    if (this.topicAliasRecv) {
      this.topicAliasRecv.clear()
    }

    debug('close :: calling _setupReconnect')
    this._setupReconnect()
  })
  EventEmitter.call(this)

  debug('MqttClient :: setting up stream')
  this._setupStream()
}
inherits(MqttClient, EventEmitter)

/**
 * setup the event handlers in the inner stream.
 *
 * @api private
 */
MqttClient.prototype._setupStream = function () {
  const that = this
  const writable = new Writable()
  const parser = mqttPacket.parser(this.options)
  let completeParse = null
  const packets = []

  debug('_setupStream :: calling method to clear reconnect')
  this._clearReconnect()

  debug('_setupStream :: using streamBuilder provided to client to create stream')
  this.stream = this.streamBuilder(this)

  parser.on('packet', function (packet) {
    debug('parser :: on packet push to packets array.')
    packets.push(packet)
  })

  function nextTickWork () {
    if (packets.length) {
      nextTick(work)
    } else {
      const done = completeParse
      completeParse = null
      done()
    }
  }

  function work () {
    debug('work :: getting next packet in queue')
    const packet = packets.shift()

    if (packet) {
      debug('work :: packet pulled from queue')
      that._handlePacket(packet, nextTickWork)
    } else {
      debug('work :: no packets in queue')
      const done = completeParse
      completeParse = null
      debug('work :: done flag is %s', !!(done))
      if (done) done()
    }
  }

  writable._write = function (buf, enc, done) {
    completeParse = done
    debug('writable stream :: parsing buffer')
    parser.parse(buf)
    work()
  }

  function streamErrorHandler (error) {
    debug('streamErrorHandler :: error', error.message)
    // error.code will only be set on NodeJS env, browse don't allow to detect erros on sockets
    // also emitting errors on browser seems to create issues 
    if (error.code) {
      // handle error
      debug('streamErrorHandler :: emitting error')
      that.emit('error', error)
    } else {
      nop(error)
    }
  }

  debug('_setupStream :: pipe stream to writable stream')
  this.stream.pipe(writable)

  // Suppress connection errors
  this.stream.on('error', streamErrorHandler)

  // Echo stream close
  this.stream.on('close', function () {
    debug('(%s)stream :: on close', that.options.clientId)
    flushVolatile(that.outgoing)
    debug('stream: emit close to MqttClient')
    that.emit('close')
  })

  // Send a connect packet
  debug('_setupStream: sending packet `connect`')
  const connectPacket = Object.create(this.options)
  connectPacket.cmd = 'connect'
  if (this.topicAliasRecv) {
    if (!connectPacket.properties) {
      connectPacket.properties = {}
    }
    if (this.topicAliasRecv) {
      connectPacket.properties.topicAliasMaximum = this.topicAliasRecv.max
    }
  }
  // avoid message queue
  sendPacket(this, connectPacket)

  // Echo connection errors
  parser.on('error', this.emit.bind(this, 'error'))

  // auth
  if (this.options.properties) {
    if (!this.options.properties.authenticationMethod && this.options.properties.authenticationData) {
      that.end(() =>
        this.emit('error', new Error('Packet has no Authentication Method')
        ))
      return this
    }
    if (this.options.properties.authenticationMethod && this.options.authPacket && typeof this.options.authPacket === 'object') {
      const authPacket = xtend({ cmd: 'auth', reasonCode: 0 }, this.options.authPacket)
      sendPacket(this, authPacket)
    }
  }

  // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
  this.stream.setMaxListeners(1000)

  clearTimeout(this.connackTimer)
  this.connackTimer = setTimeout(function () {
    debug('!!connectTimeout hit!! Calling _cleanUp with force `true`')
    that._cleanUp(true)
  }, this.options.connectTimeout)
}

MqttClient.prototype._handlePacket = function (packet, done) {
  const options = this.options

  if (options.protocolVersion === 5 && options.properties && options.properties.maximumPacketSize && options.properties.maximumPacketSize < packet.length) {
    this.emit('error', new Error('exceeding packets size ' + packet.cmd))
    this.end({ reasonCode: 149, properties: { reasonString: 'Maximum packet size was exceeded' } })
    return this
  }
  debug('_handlePacket :: emitting packetreceive')
  this.emit('packetreceive', packet)

  switch (packet.cmd) {
    case 'publish':
      this._handlePublish(packet, done)
      break
    case 'puback':
    case 'pubrec':
    case 'pubcomp':
    case 'suback':
    case 'unsuback':
      this._handleAck(packet)
      done()
      break
    case 'pubrel':
      this._handlePubrel(packet, done)
      break
    case 'connack':
      this._handleConnack(packet)
      done()
      break
    case 'auth':
      this._handleAuth(packet)
      done()
      break
    case 'pingresp':
      this._handlePingresp(packet)
      done()
      break
    case 'disconnect':
      this._handleDisconnect(packet)
      done()
      break
    default:
      // do nothing
      // maybe we should do an error handling
      // or just log it
      break
  }
}

MqttClient.prototype._checkDisconnecting = function (callback) {
  if (this.disconnecting) {
    if (callback && callback !== nop) {
      callback(new Error('client disconnecting'))
    } else {
      this.emit('error', new Error('client disconnecting'))
    }
  }
  return this.disconnecting
}

/**
 * publish - publish <message> to <topic>
 *
 * @param {String} topic - topic to publish to
 * @param {String, Buffer} message - message to publish
 * @param {Object} [opts] - publish options, includes:
 *    {Number} qos - qos level to publish on
 *    {Boolean} retain - whether or not to retain the message
 *    {Boolean} dup - whether or not mark a message as duplicate
 *    {Function} cbStorePut - function(){} called when message is put into `outgoingStore`
 * @param {Function} [callback] - function(err){}
 *    called when publish succeeds or fails
 * @returns {MqttClient} this - for chaining
 * @api public
 *
 * @example client.publish('topic', 'message');
 * @example
 *     client.publish('topic', 'message', {qos: 1, retain: true, dup: true});
 * @example client.publish('topic', 'message', console.log);
 */
MqttClient.prototype.publish = function (topic, message, opts, callback) {
  debug('publish :: message `%s` to topic `%s`', message, topic)
  const options = this.options

  // .publish(topic, payload, cb);
  if (typeof opts === 'function') {
    callback = opts
    opts = null
  }

  // default opts
  const defaultOpts = { qos: 0, retain: false, dup: false }
  opts = xtend(defaultOpts, opts)

  if (this._checkDisconnecting(callback)) {
    return this
  }

  const that = this
  const publishProc = function () {
    let messageId = 0
    if (opts.qos === 1 || opts.qos === 2) {
      messageId = that._nextId()
      if (messageId === null) {
        debug('No messageId left')
        return false
      }
    }
    const packet = {
      cmd: 'publish',
      topic: topic,
      payload: message,
      qos: opts.qos,
      retain: opts.retain,
      messageId: messageId,
      dup: opts.dup
    }

    if (options.protocolVersion === 5) {
      packet.properties = opts.properties
    }

    debug('publish :: qos', opts.qos)
    switch (opts.qos) {
      case 1:
      case 2:
        // Add to callbacks
        that.outgoing[packet.messageId] = {
          volatile: false,
          cb: callback || nop
        }
        debug('MqttClient:publish: packet cmd: %s', packet.cmd)
        that._sendPacket(packet, undefined, opts.cbStorePut)
        break
      default:
        debug('MqttClient:publish: packet cmd: %s', packet.cmd)
        that._sendPacket(packet, callback, opts.cbStorePut)
        break
    }
    return true
  }

  if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !publishProc()) {
    this._storeProcessingQueue.push(
      {
        invoke: publishProc,
        cbStorePut: opts.cbStorePut,
        callback: callback
      }
    )
  }
  return this
}

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
 * @example client.subscribe({'topic': {qos: 0}, 'topic2': {qos: 1}}, console.log);
 * @example client.subscribe('topic', console.log);
 */
MqttClient.prototype.subscribe = function () {
  const that = this
  const args = new Array(arguments.length)
  for (let i = 0; i < arguments.length; i++) {
    args[i] = arguments[i]
  }
  const subs = []
  let obj = args.shift()
  const resubscribe = obj.resubscribe
  let callback = args.pop() || nop
  let opts = args.pop()
  const version = this.options.protocolVersion

  delete obj.resubscribe

  if (typeof obj === 'string') {
    obj = [obj]
  }

  if (typeof callback !== 'function') {
    opts = callback
    callback = nop
  }

  const invalidTopic = validations.validateTopics(obj)
  if (invalidTopic !== null) {
    setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
    return this
  }

  if (this._checkDisconnecting(callback)) {
    debug('subscribe: discconecting true')
    return this
  }

  const defaultOpts = {
    qos: 0
  }
  if (version === 5) {
    defaultOpts.nl = false
    defaultOpts.rap = false
    defaultOpts.rh = 0
  }
  opts = xtend(defaultOpts, opts)

  if (Array.isArray(obj)) {
    obj.forEach(function (topic) {
      debug('subscribe: array topic %s', topic)
      if (!Object.prototype.hasOwnProperty.call(that._resubscribeTopics, topic) ||
        that._resubscribeTopics[topic].qos < opts.qos ||
          resubscribe) {
        const currentOpts = {
          topic: topic,
          qos: opts.qos
        }
        if (version === 5) {
          currentOpts.nl = opts.nl
          currentOpts.rap = opts.rap
          currentOpts.rh = opts.rh
          currentOpts.properties = opts.properties
        }
        debug('subscribe: pushing topic `%s` and qos `%s` to subs list', currentOpts.topic, currentOpts.qos)
        subs.push(currentOpts)
      }
    })
  } else {
    Object
      .keys(obj)
      .forEach(function (k) {
        debug('subscribe: object topic %s', k)
        if (!Object.prototype.hasOwnProperty.call(that._resubscribeTopics, k) ||
          that._resubscribeTopics[k].qos < obj[k].qos ||
            resubscribe) {
          const currentOpts = {
            topic: k,
            qos: obj[k].qos
          }
          if (version === 5) {
            currentOpts.nl = obj[k].nl
            currentOpts.rap = obj[k].rap
            currentOpts.rh = obj[k].rh
            currentOpts.properties = opts.properties
          }
          debug('subscribe: pushing `%s` to subs list', currentOpts)
          subs.push(currentOpts)
        }
      })
  }

  if (!subs.length) {
    callback(null, [])
    return this
  }

  const subscribeProc = function () {
    const messageId = that._nextId()
    if (messageId === null) {
      debug('No messageId left')
      return false
    }

    const packet = {
      cmd: 'subscribe',
      subscriptions: subs,
      qos: 1,
      retain: false,
      dup: false,
      messageId: messageId
    }

    if (opts.properties) {
      packet.properties = opts.properties
    }

    // subscriptions to resubscribe to in case of disconnect
    if (that.options.resubscribe) {
      debug('subscribe :: resubscribe true')
      const topics = []
      subs.forEach(function (sub) {
        if (that.options.reconnectPeriod > 0) {
          const topic = { qos: sub.qos }
          if (version === 5) {
            topic.nl = sub.nl || false
            topic.rap = sub.rap || false
            topic.rh = sub.rh || 0
            topic.properties = sub.properties
          }
          that._resubscribeTopics[sub.topic] = topic
          topics.push(sub.topic)
        }
      })
      that.messageIdToTopic[packet.messageId] = topics
    }

    that.outgoing[packet.messageId] = {
      volatile: true,
      cb: function (err, packet) {
        if (!err) {
          const granted = packet.granted
          for (let i = 0; i < granted.length; i += 1) {
            subs[i].qos = granted[i]
          }
        }

        callback(err, subs)
      }
    }
    debug('subscribe :: call _sendPacket')
    that._sendPacket(packet)
    return true
  }

  if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !subscribeProc()) {
    this._storeProcessingQueue.push(
      {
        invoke: subscribeProc,
        callback: callback
      }
    )
  }

  return this
}

/**
 * unsubscribe - unsubscribe from topic(s)
 *
 * @param {String, Array} topic - topics to unsubscribe from
 * @param {Object} [opts] - optional subscription options, includes:
 *    {Object} properties - properties of unsubscribe packet
 * @param {Function} [callback] - callback fired on unsuback
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.unsubscribe('topic');
 * @example client.unsubscribe('topic', console.log);
 */
MqttClient.prototype.unsubscribe = function () {
  const that = this
  const args = new Array(arguments.length)
  for (let i = 0; i < arguments.length; i++) {
    args[i] = arguments[i]
  }
  let topic = args.shift()
  let callback = args.pop() || nop
  let opts = args.pop()
  if (typeof topic === 'string') {
    topic = [topic]
  }

  if (typeof callback !== 'function') {
    opts = callback
    callback = nop
  }

  const invalidTopic = validations.validateTopics(topic)
  if (invalidTopic !== null) {
    setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
    return this
  }

  if (that._checkDisconnecting(callback)) {
    return this
  }

  const unsubscribeProc = function () {
    const messageId = that._nextId()
    if (messageId === null) {
      debug('No messageId left')
      return false
    }
    const packet = {
      cmd: 'unsubscribe',
      qos: 1,
      messageId: messageId
    }

    if (typeof topic === 'string') {
      packet.unsubscriptions = [topic]
    } else if (Array.isArray(topic)) {
      packet.unsubscriptions = topic
    }

    if (that.options.resubscribe) {
      packet.unsubscriptions.forEach(function (topic) {
        delete that._resubscribeTopics[topic]
      })
    }

    if (typeof opts === 'object' && opts.properties) {
      packet.properties = opts.properties
    }

    that.outgoing[packet.messageId] = {
      volatile: true,
      cb: callback
    }

    debug('unsubscribe: call _sendPacket')
    that._sendPacket(packet)

    return true
  }

  if (this._storeProcessing || this._storeProcessingQueue.length > 0 || !unsubscribeProc()) {
    this._storeProcessingQueue.push(
      {
        invoke: unsubscribeProc,
        callback: callback
      }
    )
  }

  return this
}

/**
 * end - close connection
 *
 * @returns {MqttClient} this - for chaining
 * @param {Boolean} force - do not wait for all in-flight messages to be acked
 * @param {Object} opts - added to the disconnect packet
 * @param {Function} cb - called when the client has been closed
 *
 * @api public
 */
MqttClient.prototype.end = function (force, opts, cb) {
  const that = this

  debug('end :: (%s)', this.options.clientId)

  if (force == null || typeof force !== 'boolean') {
    cb = opts || nop
    opts = force
    force = false
    if (typeof opts !== 'object') {
      cb = opts
      opts = null
      if (typeof cb !== 'function') {
        cb = nop
      }
    }
  }

  if (typeof opts !== 'object') {
    cb = opts
    opts = null
  }

  debug('end :: cb? %s', !!cb)
  cb = cb || nop

  function closeStores () {
    debug('end :: closeStores: closing incoming and outgoing stores')
    that.disconnected = true
    that.incomingStore.close(function (e1) {
      that.outgoingStore.close(function (e2) {
        debug('end :: closeStores: emitting end')
        that.emit('end')
        if (cb) {
          const err = e1 || e2
          debug('end :: closeStores: invoking callback with args')
          cb(err)
        }
      })
    })
    if (that._deferredReconnect) {
      that._deferredReconnect()
    }
  }

  function finish () {
    // defer closesStores of an I/O cycle,
    // just to make sure things are
    // ok for websockets
    debug('end :: (%s) :: finish :: calling _cleanUp with force %s', that.options.clientId, force)
    that._cleanUp(force, () => {
      debug('end :: finish :: calling process.nextTick on closeStores')
      // const boundProcess = nextTick.bind(null, closeStores)
      nextTick(closeStores.bind(that))
    }, opts)
  }

  if (this.disconnecting) {
    cb()
    return this
  }

  this._clearReconnect()

  this.disconnecting = true

  if (!force && Object.keys(this.outgoing).length > 0) {
    // wait 10ms, just to be sure we received all of it
    debug('end :: (%s) :: calling finish in 10ms once outgoing is empty', that.options.clientId)
    this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
  } else {
    debug('end :: (%s) :: immediately calling finish', that.options.clientId)
    finish()
  }

  return this
}

/**
 * removeOutgoingMessage - remove a message in outgoing store
 * the outgoing callback will be called withe Error('Message removed') if the message is removed
 *
 * @param {Number} messageId - messageId to remove message
 * @returns {MqttClient} this - for chaining
 * @api public
 *
 * @example client.removeOutgoingMessage(client.getLastAllocated());
 */
MqttClient.prototype.removeOutgoingMessage = function (messageId) {
  const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
  delete this.outgoing[messageId]
  this.outgoingStore.del({ messageId: messageId }, function () {
    cb(new Error('Message removed'))
  })
  return this
}

/**
 * reconnect - connect again using the same options as connect()
 *
 * @param {Object} [opts] - optional reconnect options, includes:
 *    {Store} incomingStore - a store for the incoming packets
 *    {Store} outgoingStore - a store for the outgoing packets
 *    if opts is not given, current stores are used
 * @returns {MqttClient} this - for chaining
 *
 * @api public
 */
MqttClient.prototype.reconnect = function (opts) {
  debug('client reconnect')
  const that = this
  const f = function () {
    if (opts) {
      that.options.incomingStore = opts.incomingStore
      that.options.outgoingStore = opts.outgoingStore
    } else {
      that.options.incomingStore = null
      that.options.outgoingStore = null
    }
    that.incomingStore = that.options.incomingStore || new Store()
    that.outgoingStore = that.options.outgoingStore || new Store()
    that.disconnecting = false
    that.disconnected = false
    that._deferredReconnect = null
    that._reconnect()
  }

  if (this.disconnecting && !this.disconnected) {
    this._deferredReconnect = f
  } else {
    f()
  }
  return this
}

/**
 * _reconnect - implement reconnection
 * @api privateish
 */
MqttClient.prototype._reconnect = function () {
  debug('_reconnect: emitting reconnect to client')
  this.emit('reconnect')
  if (this.connected) {
    this.end(() => { this._setupStream() })
    debug('client already connected. disconnecting first.')
  } else {
    debug('_reconnect: calling _setupStream')
    this._setupStream()
  }
}

/**
 * _setupReconnect - setup reconnect timer
 */
MqttClient.prototype._setupReconnect = function () {
  const that = this

  if (!that.disconnecting && !that.reconnectTimer && (that.options.reconnectPeriod > 0)) {
    if (!this.reconnecting) {
      debug('_setupReconnect :: emit `offline` state')
      this.emit('offline')
      debug('_setupReconnect :: set `reconnecting` to `true`')
      this.reconnecting = true
    }
    debug('_setupReconnect :: setting reconnectTimer for %d ms', that.options.reconnectPeriod)
    that.reconnectTimer = setInterval(function () {
      debug('reconnectTimer :: reconnect triggered!')
      that._reconnect()
    }, that.options.reconnectPeriod)
  } else {
    debug('_setupReconnect :: doing nothing...')
  }
}

/**
 * _clearReconnect - clear the reconnect timer
 */
MqttClient.prototype._clearReconnect = function () {
  debug('_clearReconnect : clearing reconnect timer')
  if (this.reconnectTimer) {
    clearInterval(this.reconnectTimer)
    this.reconnectTimer = null
  }
}

/**
 * _cleanUp - clean up on connection end
 * @api private
 */
MqttClient.prototype._cleanUp = function (forced, done) {
  const opts = arguments[2]
  if (done) {
    debug('_cleanUp :: done callback provided for on stream close')
    this.stream.on('close', done)
  }

  debug('_cleanUp :: forced? %s', forced)
  if (forced) {
    if ((this.options.reconnectPeriod === 0) && this.options.clean) {
      flush(this.outgoing)
    }
    debug('_cleanUp :: (%s) :: destroying stream', this.options.clientId)
    this.stream.destroy()
  } else {
    const packet = xtend({ cmd: 'disconnect' }, opts)
    debug('_cleanUp :: (%s) :: call _sendPacket with disconnect packet', this.options.clientId)
    this._sendPacket(
      packet,
      setImmediate.bind(
        null,
        this.stream.end.bind(this.stream)
      )
    )
  }

  if (!this.disconnecting) {
    debug('_cleanUp :: client not disconnecting. Clearing and resetting reconnect.')
    this._clearReconnect()
    this._setupReconnect()
  }

  if (this.pingTimer !== null) {
    debug('_cleanUp :: clearing pingTimer')
    this.pingTimer.clear()
    this.pingTimer = null
  }

  if (done && !this.connected) {
    debug('_cleanUp :: (%s) :: removing stream `done` callback `close` listener', this.options.clientId)
    this.stream.removeListener('close', done)
    done()
  }
}

/**
 * _sendPacket - send or queue a packet
 * @param {Object} packet - packet options
 * @param {Function} cb - callback when the packet is sent
 * @param {Function} cbStorePut - called when message is put into outgoingStore
 * @api private
 */
MqttClient.prototype._sendPacket = function (packet, cb, cbStorePut) {
  debug('_sendPacket :: (%s) ::  start', this.options.clientId)
  cbStorePut = cbStorePut || nop
  cb = cb || nop

  const err = applyTopicAlias(this, packet)
  if (err) {
    cb(err)
    return
  }

  if (!this.connected) {
    // allow auth packets to be sent while authenticating with the broker (mqtt5 enhanced auth)
    if (packet.cmd === 'auth') {
      this._shiftPingInterval()
      sendPacket(this, packet, cb)
      return
    }

    debug('_sendPacket :: client not connected. Storing packet offline.')
    this._storePacket(packet, cb, cbStorePut)
    return
  }

  // When sending a packet, reschedule the ping timer
  this._shiftPingInterval()

  switch (packet.cmd) {
    case 'publish':
      break
    case 'pubrel':
      storeAndSend(this, packet, cb, cbStorePut)
      return
    default:
      sendPacket(this, packet, cb)
      return
  }

  switch (packet.qos) {
    case 2:
    case 1:
      storeAndSend(this, packet, cb, cbStorePut)
      break
    /**
     * no need of case here since it will be caught by default
     * and jshint comply that before default it must be a break
     * anyway it will result in -1 evaluation
     */
    case 0:
      /* falls through */
    default:
      sendPacket(this, packet, cb)
      break
  }
  debug('_sendPacket :: (%s) ::  end', this.options.clientId)
}

/**
 * _storePacket - queue a packet
 * @param {Object} packet - packet options
 * @param {Function} cb - callback when the packet is sent
 * @param {Function} cbStorePut - called when message is put into outgoingStore
 * @api private
 */
MqttClient.prototype._storePacket = function (packet, cb, cbStorePut) {
  debug('_storePacket :: packet: %o', packet)
  debug('_storePacket :: cb? %s', !!cb)
  cbStorePut = cbStorePut || nop

  let storePacket = packet
  if (storePacket.cmd === 'publish') {
    // The original packet is for sending.
    // The cloned storePacket is for storing to resend on reconnect.
    // Topic Alias must not be used after disconnected.
    storePacket = clone(packet)
    const err = removeTopicAliasAndRecoverTopicName(this, storePacket)
    if (err) {
      return cb && cb(err)
    }
  }
  // check that the packet is not a qos of 0, or that the command is not a publish
  if (((storePacket.qos || 0) === 0 && this.queueQoSZero) || storePacket.cmd !== 'publish') {
    this.queue.push({ packet: storePacket, cb: cb })
  } else if (storePacket.qos > 0) {
    cb = this.outgoing[storePacket.messageId] ? this.outgoing[storePacket.messageId].cb : null
    this.outgoingStore.put(storePacket, function (err) {
      if (err) {
        return cb && cb(err)
      }
      cbStorePut()
    })
  } else if (cb) {
    cb(new Error('No connection to broker'))
  }
}

/**
 * _setupPingTimer - setup the ping timer
 *
 * @api private
 */
MqttClient.prototype._setupPingTimer = function () {
  debug('_setupPingTimer :: keepalive %d (seconds)', this.options.keepalive)
  const that = this

  if (!this.pingTimer && this.options.keepalive) {
    this.pingResp = true
    this.pingTimer = reInterval(function () {
      that._checkPing()
    }, this.options.keepalive * 1000)
  }
}

/**
 * _shiftPingInterval - reschedule the ping interval
 *
 * @api private
 */
MqttClient.prototype._shiftPingInterval = function () {
  if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
    this.pingTimer.reschedule(this.options.keepalive * 1000)
  }
}
/**
 * _checkPing - check if a pingresp has come back, and ping the server again
 *
 * @api private
 */
MqttClient.prototype._checkPing = function () {
  debug('_checkPing :: checking ping...')
  if (this.pingResp) {
    debug('_checkPing :: ping response received. Clearing flag and sending `pingreq`')
    this.pingResp = false
    this._sendPacket({ cmd: 'pingreq' })
  } else {
    // do a forced cleanup since socket will be in bad shape
    debug('_checkPing :: calling _cleanUp with force true')
    this._cleanUp(true)
  }
}

/**
 * _handlePingresp - handle a pingresp
 *
 * @api private
 */
MqttClient.prototype._handlePingresp = function () {
  this.pingResp = true
}

/**
 * _handleConnack
 *
 * @param {Object} packet
 * @api private
 */
MqttClient.prototype._handleConnack = function (packet) {
  debug('_handleConnack')
  const options = this.options
  const version = options.protocolVersion
  const rc = version === 5 ? packet.reasonCode : packet.returnCode

  clearTimeout(this.connackTimer)
  delete this.topicAliasSend

  if (packet.properties) {
    if (packet.properties.topicAliasMaximum) {
      if (packet.properties.topicAliasMaximum > 0xffff) {
        this.emit('error', new Error('topicAliasMaximum from broker is out of range'))
        return
      }
      if (packet.properties.topicAliasMaximum > 0) {
        this.topicAliasSend = new TopicAliasSend(packet.properties.topicAliasMaximum)
      }
    }
    if (packet.properties.serverKeepAlive && options.keepalive) {
      options.keepalive = packet.properties.serverKeepAlive
      this._shiftPingInterval()
    }
    if (packet.properties.maximumPacketSize) {
      if (!options.properties) { options.properties = {} }
      options.properties.maximumPacketSize = packet.properties.maximumPacketSize
    }
  }

  if (rc === 0) {
    this.reconnecting = false
    this._onConnect(packet)
  } else if (rc > 0) {
    const err = new Error('Connection refused: ' + errors[rc])
    err.code = rc
    this.emit('error', err)
  }
}

MqttClient.prototype._handleAuth = function (packet) {
  const options = this.options
  const version = options.protocolVersion
  const rc = version === 5 ? packet.reasonCode : packet.returnCode

  if (version !== 5) {
    const err = new Error('Protocol error: Auth packets are only supported in MQTT 5. Your version:' + version)
    err.code = rc
    this.emit('error', err)
    return
  }

  const that = this
  this.handleAuth(packet, function (err, packet) {
    if (err) {
      that.emit('error', err)
      return
    }

    if (rc === 24) {
      that.reconnecting = false
      that._sendPacket(packet)
    } else {
      const error = new Error('Connection refused: ' + errors[rc])
      err.code = rc
      that.emit('error', error)
    }
  })
}

/**
 * @param packet the packet received by the broker
 * @return the auth packet to be returned to the broker
 * @api public
 */
MqttClient.prototype.handleAuth = function (packet, callback) {
  callback()
}

/**
 * _handlePublish
 *
 * @param {Object} packet
 * @api private
 */
/*
those late 2 case should be rewrite to comply with coding style:

case 1:
case 0:
  // do not wait sending a puback
  // no callback passed
  if (1 === qos) {
    this._sendPacket({
      cmd: 'puback',
      messageId: messageId
    });
  }
  // emit the message event for both qos 1 and 0
  this.emit('message', topic, message, packet);
  this.handleMessage(packet, done);
  break;
default:
  // do nothing but every switch mus have a default
  // log or throw an error about unknown qos
  break;

for now i just suppressed the warnings
*/
MqttClient.prototype._handlePublish = function (packet, done) {
  debug('_handlePublish: packet %o', packet)
  done = typeof done !== 'undefined' ? done : nop
  let topic = packet.topic.toString()
  const message = packet.payload
  const qos = packet.qos
  const messageId = packet.messageId
  const that = this
  const options = this.options
  const validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153]
  if (this.options.protocolVersion === 5) {
    let alias
    if (packet.properties) {
      alias = packet.properties.topicAlias
    }
    if (typeof alias !== 'undefined') {
      if (topic.length === 0) {
        if (alias > 0 && alias <= 0xffff) {
          const gotTopic = this.topicAliasRecv.getTopicByAlias(alias)
          if (gotTopic) {
            topic = gotTopic
            debug('_handlePublish :: topic complemented by alias. topic: %s - alias: %d', topic, alias)
          } else {
            debug('_handlePublish :: unregistered topic alias. alias: %d', alias)
            this.emit('error', new Error('Received unregistered Topic Alias'))
            return
          }
        } else {
          debug('_handlePublish :: topic alias out of range. alias: %d', alias)
          this.emit('error', new Error('Received Topic Alias is out of range'))
          return
        }
      } else {
        if (this.topicAliasRecv.put(topic, alias)) {
          debug('_handlePublish :: registered topic: %s - alias: %d', topic, alias)
        } else {
          debug('_handlePublish :: topic alias out of range. alias: %d', alias)
          this.emit('error', new Error('Received Topic Alias is out of range'))
          return
        }
      }
    }
  }
  debug('_handlePublish: qos %d', qos)
  switch (qos) {
    case 2: {
      options.customHandleAcks(topic, message, packet, function (error, code) {
        if (!(error instanceof Error)) {
          code = error
          error = null
        }
        if (error) { return that.emit('error', error) }
        if (validReasonCodes.indexOf(code) === -1) { return that.emit('error', new Error('Wrong reason code for pubrec')) }
        if (code) {
          that._sendPacket({ cmd: 'pubrec', messageId: messageId, reasonCode: code }, done)
        } else {
          that.incomingStore.put(packet, function () {
            that._sendPacket({ cmd: 'pubrec', messageId: messageId }, done)
          })
        }
      })
      break
    }
    case 1: {
      // emit the message event
      options.customHandleAcks(topic, message, packet, function (error, code) {
        if (!(error instanceof Error)) {
          code = error
          error = null
        }
        if (error) { return that.emit('error', error) }
        if (validReasonCodes.indexOf(code) === -1) { return that.emit('error', new Error('Wrong reason code for puback')) }
        if (!code) { that.emit('message', topic, message, packet) }
        that.handleMessage(packet, function (err) {
          if (err) {
            return done && done(err)
          }
          that._sendPacket({ cmd: 'puback', messageId: messageId, reasonCode: code }, done)
        })
      })
      break
    }
    case 0:
      // emit the message event
      this.emit('message', topic, message, packet)
      this.handleMessage(packet, done)
      break
    default:
      // do nothing
      debug('_handlePublish: unknown QoS. Doing nothing.')
      // log or throw an error about unknown qos
      break
  }
}

/**
 * Handle messages with backpressure support, one at a time.
 * Override at will.
 *
 * @param Packet packet the packet
 * @param Function callback call when finished
 * @api public
 */
MqttClient.prototype.handleMessage = function (packet, callback) {
  callback()
}

/**
 * _handleAck
 *
 * @param {Object} packet
 * @api private
 */

MqttClient.prototype._handleAck = function (packet) {
  /* eslint no-fallthrough: "off" */
  const messageId = packet.messageId
  const type = packet.cmd
  let response = null
  const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
  const that = this
  let err

  // Checking `!cb` happens to work, but it's not technically "correct".
  //
  // Why? This code assumes that "no callback" is the same as that "we're not
  // waiting for responses" (puback, pubrec, pubcomp, suback, or unsuback).
  //
  // It would be better to check `if (!this.outgoing[messageId])` here, but
  // there's no reason to change it and risk (another) regression.
  //
  // The only reason this code works is becaues code in MqttClient.publish,
  // MqttClinet.subscribe, and MqttClient.unsubscribe ensures that we will
  // have a callback even if the user doesn't pass one in.)
  if (!cb) {
    debug('_handleAck :: Server sent an ack in error. Ignoring.')
    // Server sent an ack in error, ignore it.
    return
  }

  // Process
  debug('_handleAck :: packet type', type)
  switch (type) {
    case 'pubcomp':
      // same thing as puback for QoS 2
    case 'puback': {
      const pubackRC = packet.reasonCode
      // Callback - we're done
      if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
        err = new Error('Publish error: ' + errors[pubackRC])
        err.code = pubackRC
        cb(err, packet)
      }
      delete this.outgoing[messageId]
      this.outgoingStore.del(packet, cb)
      this.messageIdProvider.deallocate(messageId)
      this._invokeStoreProcessingQueue()
      break
    }
    case 'pubrec': {
      response = {
        cmd: 'pubrel',
        qos: 2,
        messageId: messageId
      }
      const pubrecRC = packet.reasonCode

      if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
        err = new Error('Publish error: ' + errors[pubrecRC])
        err.code = pubrecRC
        cb(err, packet)
      } else {
        this._sendPacket(response)
      }
      break
    }
    case 'suback': {
      delete this.outgoing[messageId]
      this.messageIdProvider.deallocate(messageId)
      for (let grantedI = 0; grantedI < packet.granted.length; grantedI++) {
        if ((packet.granted[grantedI] & 0x80) !== 0) {
          // suback with Failure status
          const topics = this.messageIdToTopic[messageId]
          if (topics) {
            topics.forEach(function (topic) {
              delete that._resubscribeTopics[topic]
            })
          }
        }
      }
      this._invokeStoreProcessingQueue()
      cb(null, packet)
      break
    }
    case 'unsuback': {
      delete this.outgoing[messageId]
      this.messageIdProvider.deallocate(messageId)
      this._invokeStoreProcessingQueue()
      cb(null)
      break
    }
    default:
      that.emit('error', new Error('unrecognized packet type'))
  }

  if (this.disconnecting &&
      Object.keys(this.outgoing).length === 0) {
    this.emit('outgoingEmpty')
  }
}

/**
 * _handlePubrel
 *
 * @param {Object} packet
 * @api private
 */
MqttClient.prototype._handlePubrel = function (packet, callback) {
  debug('handling pubrel packet')
  callback = typeof callback !== 'undefined' ? callback : nop
  const messageId = packet.messageId
  const that = this

  const comp = { cmd: 'pubcomp', messageId: messageId }

  that.incomingStore.get(packet, function (err, pub) {
    if (!err) {
      that.emit('message', pub.topic, pub.payload, pub)
      that.handleMessage(pub, function (err) {
        if (err) {
          return callback(err)
        }
        that.incomingStore.del(pub, nop)
        that._sendPacket(comp, callback)
      })
    } else {
      that._sendPacket(comp, callback)
    }
  })
}

/**
 * _handleDisconnect
 *
 * @param {Object} packet
 * @api private
 */
MqttClient.prototype._handleDisconnect = function (packet) {
  this.emit('disconnect', packet)
}

/**
 * _nextId
 * @return unsigned int
 */
MqttClient.prototype._nextId = function () {
  return this.messageIdProvider.allocate()
}

/**
 * getLastMessageId
 * @return unsigned int
 */
MqttClient.prototype.getLastMessageId = function () {
  return this.messageIdProvider.getLastAllocated()
}

/**
 * _resubscribe
 * @api private
 */
MqttClient.prototype._resubscribe = function () {
  debug('_resubscribe')
  const _resubscribeTopicsKeys = Object.keys(this._resubscribeTopics)
  if (!this._firstConnection &&
      (this.options.clean || (this.options.protocolVersion === 5 && !this.connackPacket.sessionPresent)) &&
      _resubscribeTopicsKeys.length > 0) {
    if (this.options.resubscribe) {
      if (this.options.protocolVersion === 5) {
        debug('_resubscribe: protocolVersion 5')
        for (let topicI = 0; topicI < _resubscribeTopicsKeys.length; topicI++) {
          const resubscribeTopic = {}
          resubscribeTopic[_resubscribeTopicsKeys[topicI]] = this._resubscribeTopics[_resubscribeTopicsKeys[topicI]]
          resubscribeTopic.resubscribe = true
          this.subscribe(resubscribeTopic, { properties: resubscribeTopic[_resubscribeTopicsKeys[topicI]].properties })
        }
      } else {
        this._resubscribeTopics.resubscribe = true
        this.subscribe(this._resubscribeTopics)
      }
    } else {
      this._resubscribeTopics = {}
    }
  }

  this._firstConnection = false
}

/**
 * _onConnect
 *
 * @api private
 */
MqttClient.prototype._onConnect = function (packet) {
  if (this.disconnected) {
    this.emit('connect', packet)
    return
  }

  const that = this

  this.connackPacket = packet
  this.messageIdProvider.clear()
  this._setupPingTimer()

  this.connected = true

  function startStreamProcess () {
    let outStore = that.outgoingStore.createStream()

    function clearStoreProcessing () {
      that._storeProcessing = false
      that._packetIdsDuringStoreProcessing = {}
    }

    that.once('close', remove)
    outStore.on('error', function (err) {
      clearStoreProcessing()
      that._flushStoreProcessingQueue()
      that.removeListener('close', remove)
      that.emit('error', err)
    })

    function remove () {
      outStore.destroy()
      outStore = null
      that._flushStoreProcessingQueue()
      clearStoreProcessing()
    }

    function storeDeliver () {
      // edge case, we wrapped this twice
      if (!outStore) {
        return
      }
      that._storeProcessing = true

      const packet = outStore.read(1)

      let cb

      if (!packet) {
        // read when data is available in the future
        outStore.once('readable', storeDeliver)
        return
      }

      // Skip already processed store packets
      if (that._packetIdsDuringStoreProcessing[packet.messageId]) {
        storeDeliver()
        return
      }

      // Avoid unnecessary stream read operations when disconnected
      if (!that.disconnecting && !that.reconnectTimer) {
        cb = that.outgoing[packet.messageId] ? that.outgoing[packet.messageId].cb : null
        that.outgoing[packet.messageId] = {
          volatile: false,
          cb: function (err, status) {
            // Ensure that the original callback passed in to publish gets invoked
            if (cb) {
              cb(err, status)
            }

            storeDeliver()
          }
        }
        that._packetIdsDuringStoreProcessing[packet.messageId] = true
        if (that.messageIdProvider.register(packet.messageId)) {
          that._sendPacket(packet)
        } else {
          debug('messageId: %d has already used.', packet.messageId)
        }
      } else if (outStore.destroy) {
        outStore.destroy()
      }
    }

    outStore.on('end', function () {
      let allProcessed = true
      for (const id in that._packetIdsDuringStoreProcessing) {
        if (!that._packetIdsDuringStoreProcessing[id]) {
          allProcessed = false
          break
        }
      }
      if (allProcessed) {
        clearStoreProcessing()
        that.removeListener('close', remove)
        that._invokeAllStoreProcessingQueue()
        that.emit('connect', packet)
      } else {
        startStreamProcess()
      }
    })
    storeDeliver()
  }
  // start flowing
  startStreamProcess()
}

MqttClient.prototype._invokeStoreProcessingQueue = function () {
  if (this._storeProcessingQueue.length > 0) {
    const f = this._storeProcessingQueue[0]
    if (f && f.invoke()) {
      this._storeProcessingQueue.shift()
      return true
    }
  }
  return false
}

MqttClient.prototype._invokeAllStoreProcessingQueue = function () {
  while (this._invokeStoreProcessingQueue()) { /* empty */ }
}

MqttClient.prototype._flushStoreProcessingQueue = function () {
  for (const f of this._storeProcessingQueue) {
    if (f.cbStorePut) f.cbStorePut(new Error('Connection closed'))
    if (f.callback) f.callback(new Error('Connection closed'))
  }
  this._storeProcessingQueue.splice(0)
}

module.exports = MqttClient
