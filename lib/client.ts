'use strict'
/**
 * Module dependencies
 */
import * as events from 'events'
import * as eos from 'end-of-stream'
import * as mqttPacket from 'mqtt-packet'
import * as reInterval from 'reinterval'
import { Writable } from 'readable-stream'
import Store from './store'
import validations from './validations'
import EventEmitter = NodeJS.EventEmitter

import {
  QoS, Packet, PubrelPacket, PublishPacket,
  ConnackPacket, PingrespPacket, UnsubscribePacket, SubackPacket,
  SubscribePacket, ConnectPacket
} from './types'

import {
  ClientOptions, ClientSubscribeOptions,
  ClientPublishOptions
} from './client-options'

const setImmediate = global.setImmediate || function (callback: Function) {
  // works in node v0.8
  process.nextTick(callback)
}

const defaultConnectOptions = {
  keepalive: 60,
  reschedulePings: true,
  protocolId: 'MQTT',
  protocolVersion: 4,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true
}

function defaultId () {
  return 'mqttjs_' + Math.random().toString(16).substr(2, 8)
}

function sendPacket (client: MqttClient, packet: Packet, cb?: Function) {
  client.emit('packetsend', packet)

  const result = mqttPacket.writeToStream(packet, client.stream)

  if (!result && cb) {
    client.stream.once('drain', cb)
  } else if (cb) {
    cb()
  }
}

function storeAndSend (client: MqttClient, packet: Packet, cb?: Function) {
  client.outgoingStore.put(packet, function storedPacket (err: Error) {
    if (err) {
      return cb && cb(err)
    }
    sendPacket(client, packet, cb)
  })
}

function nop () {}


export interface SubscriptionGrant {
    /**
     *  is a subscribed to topic
     */
    topic: string
    /**
     *  is the granted qos level on it
     */
    qos: QoS | number
}

export interface SubscriptionRequest {
    /**
     *  is a subscribed to topic
     */
    topic: string
    /**
     *  is the granted qos level on it
     */
    qos: QoS
}

export interface SubscriptionMap {
    /**
     * object which has topic names as object keys and as value the QoS, like {'test1': 0, 'test2': 1}.
     */
    [topic: string]: QoS
}


export type ClientSubscribeCallback = (err: Error, granted: SubscriptionGrant[]) => void
export type OnMessageCallback = (topic: string, payload: Buffer, packet: Packet) => void
export type OnPacketCallback = (packet: Packet) => void
export type OnErrorCallback = (error: Error) => void
export type PacketCallback = (error?: Error, packet?: Packet) => any

export interface IReinterval {clear: () => void, reschedule(ms: number)}
export interface IStream extends EventEmitter {
  pipe(to: any)
  destroy()
  end()
}

/* ------------------------------- END ADDONS ------------------------------- */

/**
 * MqttClient constructor
 *
 * @param {Stream} stream - stream
 * @param {Object} [options] - connection options
 * (see Connection#connect)
 */
export class MqttClient extends events.EventEmitter {
  // connack timer
  connackTimer: NodeJS.Timer = null
  // Reconnect timer
  reconnectTimer: NodeJS.Timer = null
  // Ping timer, setup in _setupPingTimer
  pingTimer: IReinterval = null

  // Is the client connected?
  connected: false
  // Are we disconnecting?
  disconnecting = false
  disconnected: boolean = null
  reconnecting: boolean = null
  pingResp = false


  // MessageIDs starting with 1
  nextId: number = Math.floor(Math.random() * 65535)
  // Packet queue
  queue: Array<{packet: Packet, cb: PacketCallback}> = []
  _subscribedTopics: any = {}
  outgoing: {[x: number]: PacketCallback} = {}

  // Configured in constructor by options
  incomingStore: Store
  outgoingStore: Store
  stream: IStream // TODO stream
  streamBuilder: (MqttClient) => IStream
  options: ClientOptions
  queueQoSZero: boolean

  on(event: 'message', cb: OnMessageCallback): this
  on(event: 'packetsend' | 'packetreceive', cb: OnPacketCallback): this
  on(event: 'error', cb: OnErrorCallback): this
  on(event: string, cb: Function)
  on(event: string, cb: Function) {
    super.on(event, cb)
    return this
  }

  once(event: 'message', cb: OnMessageCallback): this
  once(event: 'packetsend' | 'packetreceive', cb: OnPacketCallback): this
  once(event: 'error', cb: OnErrorCallback): this
  once(event: string, cb: Function)
  once(event: string, cb: Function) {
    super.once(event, cb)
    return this
  }

  constructor (streamBuilder, options) {
    super()
    this.streamBuilder = streamBuilder
    const that = this

    // if (!(this instanceof MqttClient)) {
    //   return new MqttClient(streamBuilder, options)
    // }

    this.options = options || {}
    // Defaults
    for (const k in defaultConnectOptions) {
      if (typeof this.options[k] === 'undefined') {
        this.options[k] = defaultConnectOptions[k]
      } else {
        this.options[k] = options[k]
      }
    }

    this.options.clientId = this.options.clientId || defaultId()

    // Inflight message storages
    this.outgoingStore = this.options.outgoingStore || new Store()
    this.incomingStore = this.options.incomingStore || new Store()

    // Should QoS zero messages be queued when the connection is broken?
    this.queueQoSZero = this.options.queueQoSZero === undefined ? true : this.options.queueQoSZero

    // Mark connected on connect
    this.on('connect', function () {
      if (this.disconnected) {
        return
      }

      this.connected = true
      let outStore = null
      outStore = this.outgoingStore.createStream()

      // Control of stored messages
      outStore.once('readable', function () {
        function storeDeliver () {
          const packet = outStore.read(1) as Packet
          let cb

          if (!packet) {
            return
          }

          // Avoid unnecesary stream read operations when disconnected
          if (!that.disconnecting && !that.reconnectTimer && that.options.reconnectPeriod > 0) {
            outStore.read(0)
            cb = that.outgoing[packet.messageId]
            that.outgoing[packet.messageId] = function (err, status) {
              // Ensure that the original callback passed in to publish gets invoked
              if (cb) {
                cb(err, status)
              }

              storeDeliver()
            }
            that._sendPacket(packet)
          } else if (outStore.destroy) {
            outStore.destroy()
          }
        }
        storeDeliver()
      })
      .on('error', this.emit.bind(this, 'error'))
    })

    // Mark disconnected on stream close
    this.on('close', function () {
      this.connected = false
      clearTimeout(this.connackTimer)
    })

    // Setup ping timer
    this.on('connect', this._setupPingTimer)

    // Send queued packets
    this.on('connect', function () {
      const queue = this.queue

      function deliver () {
        const entry = queue.shift()
        let packet = null

        if (!entry) {
          return
        }

        packet = entry.packet

        that._sendPacket(
          packet,
          function (err) {
            if (entry.cb) {
              entry.cb(err)
            }
            deliver()
          }
        )
      }

      deliver()
    })

    // resubscribe
    this.on('connect', function () {
      if (this.options.clean && Object.keys(this._subscribedTopics).length > 0) {
        this.subscribe(this._subscribedTopics)
      }
    })

    // Clear ping timer
    this.on('close', function () {
      if (that.pingTimer !== null) {
        that.pingTimer.clear()
        that.pingTimer = null
      }
    })

    // Setup reconnect timer on disconnect
    this.on('close', this._setupReconnect)
    this._setupStream()
  }

  /**
   * setup the event handlers in the inner stream.
   *
   * @api private
   */
  _setupStream () {
    let connectPacket: ConnectPacket & ClientOptions
    const that = this
    const writable = new Writable()
    const parser = mqttPacket.parser(this.options)
    let completeParse: PacketCallback = null
    const packets: Packet[] = []

    this._clearReconnect()

    this.stream = this.streamBuilder(this)

    parser.on('packet', function (packet: Packet) {
      packets.push(packet)
    })

    function process () {
      const packet = packets.shift()
      //noinspection UnnecessaryLocalVariableJS
      const done = completeParse

      if (packet) {
        that._handlePacket(packet, process)
      } else {
        completeParse = null
        done()
      }
    }

    writable._write = function (buf: Buffer, enc: string, done: PacketCallback) {
      completeParse = done
      parser.parse(buf)
      process()
    }

    this.stream.pipe(writable)

    // Suppress connection errors
    this.stream.on('error', nop)

    // Echo stream close
    eos(this.stream, this.emit.bind(this, 'close'))

    // Send a connect packet
    connectPacket = Object.create(this.options) as ConnectPacket & {cmd: ''}
    connectPacket.cmd = 'connect'
    // avoid message queue
    sendPacket(this, connectPacket)

    // Echo connection errors
    parser.on('error', this.emit.bind(this, 'error'))

    // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
    this.stream.setMaxListeners(1000)

    clearTimeout(this.connackTimer)
    this.connackTimer = setTimeout(function () {
      that._cleanUp(true)
    }, this.options.connectTimeout)
  }

  _handlePacket (packet: Packet, done: PacketCallback) {
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
      case 'pingresp':
        this._handlePingresp(packet)
        done()
        break
      default:
        // do nothing
        // maybe we should do an error handling
        // or just log it
        break
    }
  }

  _checkDisconnecting (callback: PacketCallback) {
    if (this.disconnecting) {
      if (callback) {
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
   * @param {(String|Buffer)} message - message to publish
   *
   * @param {Object}    [opts] - publish options, includes:
   *   @param {Number}  [opts.qos] - qos level to publish on
   *   @param {Boolean} [opts.retain] - whether or not to retain the message
   *
   * @param {Function} [callback] - function(err){}
   *    called when publish succeeds or fails
   * @returns {Client} this - for chaining
   * @api public
   *
   * @example client.publish('topic', 'message');
   * @example
   *     client.publish('topic', 'message', {qos: 1, retain: true});
   * @example client.publish('topic', 'message', console.log);
   */
  publish(topic: string, message: string | Buffer, opts: ClientPublishOptions, callback?: PacketCallback): this
  publish(topic: string, message: string | Buffer, callback?: PacketCallback): this
  publish(topic: string, message: string | Buffer, opts?: ClientPublishOptions, callback?: PacketCallback): this {
    // .publish(topic, payload, cb);
    if (typeof opts === 'function') {
      callback = opts
      opts = null
    }

    // Default opts
    if (!opts) {
      opts = {qos: 0, retain: false}
    }

    if (this._checkDisconnecting(callback)) {
      return this
    }

    const packet: PublishPacket = {
      cmd: 'publish',
      topic: topic,
      payload: message,
      qos: opts.qos,
      dup: null, /* TODO: */
      retain: opts.retain,
      messageId: this._nextId()
    }

    switch (opts.qos) {
      case 1:
      case 2:

        // Add to callbacks
        this.outgoing[packet.messageId] = callback || nop
        this._sendPacket(packet)
        break
      default:
        this._sendPacket(packet, callback)
        break
    }

    return this
  }

  /**
   * subscribe - subscribe to <topic>
   *
   * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
   * @param {Object} [opts] - optional subscription options, includes:
   * @param  {Number} [opts.qos] - subscribe qos level
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
  subscribe(topic: string | string[],  opts: ClientSubscribeOptions, callback?: ClientSubscribeCallback): this
  subscribe(topic: string | string[] | SubscriptionMap,  callback?: ClientSubscribeCallback): this
  subscribe(...args: any[]) {
    let packet: SubscribePacket
    const subs: SubscriptionRequest[] = []
    let obj = args.shift()
    let callback = args.pop() || nop
    let opts = args.pop()
    let invalidTopic
    const that = this

    if (typeof obj === 'string') {
      obj = [obj]
    }

    if (typeof callback !== 'function') {
      opts = callback
      callback = nop
    }

    invalidTopic = validations.validateTopics(obj)
    if (invalidTopic !== null) {
      setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
      return this
    }

    if (this._checkDisconnecting(callback)) {
      return this
    }

    if (!opts) {
      opts = { qos: 0 }
    }

    if (Array.isArray(obj)) {
      obj.forEach(function (topic) {
        subs.push({
          topic: topic,
          qos: opts.qos
        })
      })
    } else {
      Object
        .keys(obj)
        .forEach(function (k) {
          subs.push({
            topic: k,
            qos: obj[k]
          })
        })
    }

    packet = {
      cmd: 'subscribe',
      subscriptions: subs,
      // qos: 1,
      // retain: false,
      // dup: false,
      messageId: this._nextId()
    }

    this.outgoing[packet.messageId] = function (err, subAck: SubackPacket) {
      if (!err) {
        subs.forEach(function (sub) {
          that._subscribedTopics[sub.topic] = sub.qos
        })

        const granted = subAck.granted
        for (let i = 0; i < granted.length; i += 1) {
          subs[i].qos = (granted[i] as QoS)
        }
      }

      callback(err, subs)
    }

    this._sendPacket(packet)

    return this
  }

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
  unsubscribe (topic: string | string[], callback: PacketCallback) {
    //noinspection SpellCheckingInspection
    let unsubscriptions: string[]
    if (typeof topic === 'string') {
      unsubscriptions = [topic]
    } else if (typeof topic === 'object' && topic.length) {
      unsubscriptions = topic
    }

    const packet: UnsubscribePacket = {
      cmd: 'unsubscribe',
      // qos: 1, TODO:
      messageId: this._nextId(),
      unsubscriptions
    }

    const that = this
    callback = callback || nop
    if (this._checkDisconnecting(callback)) {
      return this
    }

    packet.unsubscriptions.forEach(function (unsubscribedTopic) {
      delete that._subscribedTopics[unsubscribedTopic]
    })

    this.outgoing[packet.messageId] = callback

    this._sendPacket(packet)

    return this
  }

  /**
   * end - close connection
   *
   * @returns {MqttClient} this - for chaining
   * @param {Boolean} force - do not wait for all in-flight messages to be acked
   * @param {Function} cb - called when the client has been closed
   *
   * @api public
   */
  end (force?: boolean, cb?: boolean) {
    const that = this

    if (typeof force === 'function') {
      cb = force
      force = false
    }

    function closeStores () {
      that.disconnected = true
      that.incomingStore.close(function () {
        that.outgoingStore.close(cb)
      })
    }

    function finish () {
      // defer closesStores of an I/O cycle,
      // just to make sure things are
      // ok for websockets
      that._cleanUp(force, setImmediate.bind(null, closeStores))
    }

    if (this.disconnecting) {
      return this
    }

    this._clearReconnect()

    this.disconnecting = true

    if (!force && Object.keys(this.outgoing).length > 0) {
      // wait 10ms, just to be sure we received all of it
      this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
    } else {
      finish()
    }

    return this
  }

  /**
   * _reconnect - implement reconnection
   * @api privateish
   */
  private _reconnect () {
    this.emit('reconnect')
    this._setupStream()
  }

  /**
   * _setupReconnect - setup reconnect timer
   */
  private _setupReconnect () {
    const that = this

    if (!that.disconnecting && !that.reconnectTimer && (that.options.reconnectPeriod > 0)) {
      if (!this.reconnecting) {
        this.emit('offline')
        this.reconnecting = true
      }
      that.reconnectTimer = setInterval(function () {
        that._reconnect()
      }, that.options.reconnectPeriod)
    }
  }

  /**
   * _clearReconnect - clear the reconnect timer
   */
  private _clearReconnect () {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  /**
   * _cleanUp - clean up on connection end
   * @api private
   */
  private _cleanUp (forced: boolean, done?: Function) {
    if (done) {
      this.stream.on('close', done)
    }

    if (forced) {
      this.stream.destroy()
    } else {
      this._sendPacket(
        { cmd: 'disconnect' },
        setImmediate.bind(
          null,
          this.stream.end.bind(this.stream)
        )
      )
    }

    if (!this.disconnecting) {
      this._clearReconnect()
      this._setupReconnect()
    }

    if (this.pingTimer !== null) {
      this.pingTimer.clear()
      this.pingTimer = null
    }
  }

  /**
   * _sendPacket - send or queue a packet
   * @param {Object} packet - packet options
   * @param {Function} cb - callback when the packet is sent
   * @api private
   */
  private _sendPacket (packet: Packet, cb?: PacketCallback) {
    if (!this.connected) {
      if ((packet.cmd === 'publish' && packet.qos > 0) ||
         (packet.cmd !== 'publish') ||
          this.queueQoSZero) {
        this.queue.push({ packet: packet, cb: cb })
      } else if (cb) {
        cb(new Error('No connection to broker'))
      }

      return
    }

    // When sending a packet, reschedule the ping timer
    this._shiftPingInterval()

    if (packet.cmd !== 'publish') {
      sendPacket(this, packet, cb)
      return
    }

    switch (packet.qos) {
      case 2:
      case 1:
        storeAndSend(this, packet, cb)
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
  }

  /**
   * _setupPingTimer - setup the ping timer
   *
   * @api private
   */
  private _setupPingTimer () {
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
  private _shiftPingInterval () {
    if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
      this.pingTimer.reschedule(this.options.keepalive * 1000)
    }
  }

  /**
   * _checkPing - check if a pingresp has come back, and ping the server again
   *
   * @api private
   */
  private _checkPing () {
    if (this.pingResp) {
      this.pingResp = false
      this._sendPacket({ cmd: 'pingreq' })
    } else {
      // do a forced cleanup since socket will be in bad shape
      this._cleanUp(true)
    }
  }

  /**
   * _handlePingresp - handle a pingresp
   *
   * @api private
   */
  private _handlePingresp (packet: PingrespPacket) {
    this.pingResp = true
  }

  /**
   * _handleConnack
   *
   * @param {Object} packet
   * @api private
   */

  private _handleConnack (packet: ConnackPacket) {
    const rc = packet.returnCode
    const errors = [
      '',
      'Unacceptable protocol version',
      'Identifier rejected',
      'Server unavailable',
      'Bad username or password',
      'Not authorized'
    ]

    clearTimeout(this.connackTimer)

    if (rc === 0) {
      this.reconnecting = false
      this.emit('connect', packet)
    } else if (rc > 0) {
      this.emit('error', new Error('Connection refused: ' + errors[rc]))
    }
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
        messageId: mid
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
  private _handlePublish (packet: PublishPacket, done: PacketCallback) {
    const topic = packet.topic.toString()
    const message = packet.payload
    const qos = packet.qos
    const mid = packet.messageId
    const that = this

    switch (qos) {
      case 2:
        this.incomingStore.put(packet, function () {
          that._sendPacket({cmd: 'pubrec', messageId: mid}, done)
        })
        break
      case 1:
        // do not wait sending a puback
        // no callback passed
        this._sendPacket({
          cmd: 'puback',
          messageId: mid
        })
        /* falls through */
      case 0:
        // emit the message event for both qos 1 and 0
        this.emit('message', topic, message, packet)
        this.handleMessage(packet, done)
        break
      default:
        // do nothing
        // log or throw an error about unknown qos
        break
    }
  }

  /**
   * Handle messages with backpressure support, one at a time.
   * Override at will.
   *
   * @param packet packet the packet
   * @param callback callback call when finished
   * @api public
   */
  handleMessage (packet: Packet, callback: PacketCallback) {
    callback()
  }

  /**
   * _handleAck
   *
   * @param {Object} packet
   * @api private
   */

  private _handleAck (packet: Packet) {
    /* eslint no-fallthrough: "off" */
    const mid = packet.messageId
    const type = packet.cmd
    const cb = this.outgoing[mid]
    const that = this
    let response = null

    if (!cb) {
      // Server sent an ack in error, ignore it.
      return
    }

    // Process
    switch (type) {
      case 'pubcomp':
        // same thing as puback for QoS 2
      case 'puback':
        // Callback - we're done
        delete this.outgoing[mid]
        this.outgoingStore.del(packet, cb)
        break
      case 'pubrec':
        response = {
          cmd: 'pubrel',
          qos: 2,
          messageId: mid
        }

        this._sendPacket(response)
        break
      case 'suback':
        delete this.outgoing[mid]
        cb(null, packet)
        break
      case 'unsuback':
        delete this.outgoing[mid]
        cb(null, null /* TODO: packet*/)
        break
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
   * @param callback
   * @api private
   */

  private _handlePubrel (packet: PubrelPacket, callback: PacketCallback) {
    const mid = packet.messageId
    const that = this

    that.incomingStore.get(packet, function (err, pub: Packet) {
      if (err) {
        return that.emit('error', err)
      }

      // TODO: check, I changed this while annotating
      // if (pub.cmd !== 'pubrel') {
      if (pub.cmd === 'publish') {
        that.emit('message', pub.topic, pub.payload, pub)
        that.incomingStore.put(packet)
      }

      that._sendPacket({cmd: 'pubcomp', messageId: mid}, callback)
    })
  }

  /**
   * _nextId
   */
  private _nextId () {
    const id = this.nextId++
    // Ensure 16 bit unsigned int:
    if (id === 65535) {
      this.nextId = 1
    }
    return id
  }

  /**
   * getLastMessageId
   */
  getLastMessageId () {
    return (this.nextId === 1) ? 65535 : (this.nextId - 1)
  }
}

export {ClientOptions}
