'use strict'

import * as mqtt from 'mqtt-packet'
import { handle } from './handlers'
import { ConnectOptions } from '.'
import { EventEmitter } from 'stream'
import { connectionFactory } from './connectionFactory'

// const eventEmitter = require('events')
// const mqttErrors = require('errors')

const logger = require('pino')()

export class MqttClient extends EventEmitter {
  static isBrowser: boolean // This can be the global check for browser compatibility.
  closed: boolean
  connecting: boolean
  connected: boolean
  errored: boolean
  id: any
  clean: boolean
  version: any
  _isBrowser: boolean
  protocol: any
  port: any
  hostname: any
  rejectUnauthorized: any
  stream: any
  _reconnectCount: number
  _disconnected: boolean
  _authorized: boolean
  _parser: mqtt.Parser
  _defaultConnectOptions: { keepalive: number; reschedulePings: boolean; protocolId: string; protocolVersion: number; reconnectPeriod: number; connectTimeout: number; clean: boolean; resubscribe: boolean }
  _options: any
  _parsingBatch: any
  connackSent: boolean
  _queueLimit: any
  queue: any
  options: any
  disconnected: boolean
  incomingStore: any
  outgoingStore: any
  _deferredReconnect: any
  disconnecting: any
  reconnectTimer: any
  reconnecting: any
  pingTimer: any
  queueQoSZero: boolean
  _port: any
  _host: any
  tlsOptions: any
  wsOptions: any
  brokerUrl: URL
  keepalive: any
  reschedulePings: any
  clientId: any
  protocolId: any
  protocolVersion: any
  reconnectPeriod: any
  connectTimeout: any
  username: any
  password: any
  customHandleAcks: any
  properties: { sessionExpiryInterval: number; receiveMaximum: number; maximumPacketSize: number; topicAliasMaximum: number; requestResponseInformation: boolean; requestProblemInformation: boolean; userPropertis: any; authenticationMethod: string; authenticationData: BinaryData }
  authPacket: any
  will: {
    topic: any; payload: any; qos: number; retain: boolean; properties: {
      willDelayInterval: number; payloadFormatIndicator: boolean; messageExpiryInterval: number // eslint-disable-next-line camelcase
      // eslint-disable-next-line camelcase
      // TODO: _isBrowser should be a global value and should be standardized....
      // Connect Information
      contentType: string; responseTopic: string; correlationData: BinaryData; userProperties: any
    }
  }
  transformWsUrl: (opts: any) => URL
  resubscribe: boolean
  messageIdProvider: any
  parserQueue: any[]
  private _paused: any
  private _eos: any

  constructor (options: ConnectOptions) {
    super()
    // assume that the options have been validated before instantiating the client.
    this.closed = false
    this.connecting = false
    this.connected = false
    this.errored = false
    this.id = null
    this.clean = true
    this.version = null
    this.parserQueue = []
    // eslint-disable-next-line camelcase
    // TODO: _isBrowser should be a global value and should be standardized....

    // Using this method to clean up the constructor to do options handling 
    this._injestOptions(options)

    // NOTE: STOP USING OPTIONS PAST THIS POINT
    // buildStream shouldn't rely on the options object. Let's have the option object used up beforehand and then
    // essentially discarded, so after this point it is never used again and only class fields are referenced. 
    this.stream = options.customStreamFactory? options.customStreamFactory(options) : connectionFactory(options)

    this._reconnectCount = 0

    this._disconnected = false
    this._authorized = false
    this._parser = mqtt.parser()
    this._defaultConnectOptions = {
      keepalive: 60,
      reschedulePings: true,
      protocolId: 'MQTT',
      protocolVersion: 4,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      clean: true,
      resubscribe: true
    }

    this._options = options || { ...this._defaultConnectOptions }
    this._options.clientId = options.clientId || `mqttjs_ ${Math.random().toString(16).substr(2, 8)}`
    this._parser.on('packet', this.enqueue)
    this.once('connected', this.dequeue)
    this.on('close', this._closeClient)

    this.stream.on('readable', this.nextBatch)

    this.on('error', this.onError)
    this.stream.on('error', this.emit.bind(this, 'error'))
    this._parser.on('error', this.emit.bind(this, 'error'))
  
    this.stream.on('end', this.close.bind(this))
    this._eos = eos(this.stream, this.close.bind(this))
  }

  close (done) {
    if (this.closed) {
      if (typeof done === 'function') {
        done()
      }
      return
    }
  
    this.closed = true
  
    this._parser.removeAllListeners('packet')
    conn.removeAllListeners('readable')
  
    this._parser._queue = null
  
    if (this._keepaliveTimer) {
      this._keepaliveTimer.clear()
      this._keepaliveInterval = -1
      this._keepaliveTimer = null
    }
  
    if (this._connectTimer) {
      clearTimeout(this._connectTimer)
      this._connectTimer = null
    }
  
    this._eos()
    this._eos = noop
  
    handleUnsubscribe(
      this,
      {
        unsubscriptions: Object.keys(this.subscriptions)
      },
      finish)
  
    function finish () {
      const will = that.will
      // _disconnected is set only if client is disconnected with a valid disconnect packet
      if (!that._disconnected && will) {
        that.broker.authorizePublish(that, will, function (err) {
          if (err) { return done() }
          that.broker.publish(will, that, done)
  
          function done () {
            that.broker.persistence.delWill({
              id: that.id,
              brokerId: that.broker.id
            }, noop)
          }
        })
      }
      that.will = null // this function might be called twice
      that._will = null
  
      that.connected = false
      that.connecting = false
  
      conn.removeAllListeners('error')
      conn.on('error', noop)
  
      if (that.broker.clients[that.id] && that._authorized) {
        that.broker.unregisterClient(that)
      }
  
      // clear up the drain event listeners
      that.conn.emit('drain')
      that.conn.removeAllListeners('drain')
  
      conn.destroy()
  
      if (typeof done === 'function') {
        done()
      }
    }
  }

  onError (err) {
    if (!err) return
  
    this.errored = true
    this.stream.removeAllListeners('error')
    this.stream.on('error', noop)
    // hack to clean up the write callbacks in case of error
    const state = this.conn._writableState
    const list = typeof state.getBuffer === 'function' ? state.getBuffer() : state.buffer
    list.forEach(drainRequest)
    this.broker.emit(this.id ? 'clientError' : 'connectionError', this, err)
    this.close()
  }

  _injestOptions(options: ConnectOptions) {
    // Connect Information
    this.brokerUrl = options.brokerUrl as URL
    this.wsOptions = options.wsOptions
    this.tlsOptions = options.tlsOptions
    this.keepalive = options.keepalive
    this.reschedulePings = options.reschedulePings
    this.clientId = options.clientId
    this.protocolId = options.protocolId
    this.protocolVersion = options.protocolVersion
    this.clean = options.clean
    this.reconnectPeriod = options.reconnectPeriod
    this.connectTimeout = options.connectTimeout
    this.username = options.username
    this.password = options.password
    this.incomingStore = options.incomingStore
    this.outgoingStore = options.outgoingStore
    this.queueQoSZero = options.queueQoSZero
    this.customHandleAcks = options.customHandleAcks
    this.properties = options.properties
    this.authPacket = options.authPacket
    this.will = options.will
    this.transformWsUrl = options.transformWsUrl
    this.resubscribe = options.resubscribe
    this.messageIdProvider = options.messageIdProvider
  }

  async enqueue (packet) {
    this._parsingBatch++
    // already connected or it's the first packet
    if (this.connackSent || this._parsingBatch === 1) {
      const result = await handle(this, packet)
      this.nextBatch(result)
    } else {
      if (this.parserQueue.length < this._queueLimit) {
        this.parserQueue.push(packet)
      } else {
        this.emit('error', new Error('Client queue limit reached'))
      }
    }
  }

  async dequeue () {
    const q = this.parserQueue
    for (let i = 0, len = q.length; i < len; i++) {
      const result = await handle(this, q[i])
      this.nextBatch(result)
    }
  }

  nextBatch (err) {
    if (err) {
      this.emit('error', err)
      return
    }

    if (this._paused) {
      return
    }

    this._parsingBatch--
    if (this._parsingBatch <= 0) {
      this._parsingBatch = 0
      const buf = this.stream.read(null)
      if (buf) {
        this._parser.parse(buf)
      }
    }
  }




  deliver0 = function deliverQoS0 (_packet, cb) {
    const toForward = dedupe(this, _packet) &&
      this.broker.authorizeForward(this, _packet)
    if (toForward) {
      // Give nodejs some time to clear stacks, or we will see
      // "Maximum call stack size exceeded" in a very high load
      setImmediate(() => {
        const packet = new Packet(toForward, broker)
        packet.qos = 0
        write(this, packet, function (err) {
          this._onError(err)
          cb() // don't pass the error here or it will be thrown by mqemitter
        })
      })
    } else {
      setImmediate(cb)
    }
  }

  _closeClient () {
    logger('close :: connected set to `false`')
    this.connected = false

    logger('close :: clearing connackTimer')
    clearTimeout(this.connackTimer)

    logger('close :: clearing ping timer')
    if (this.pingTimer !== null) {
      this.pingTimer.clear()
      this.pingTimer = null
    }

    logger('close :: calling _setupReconnect')
    this._setupReconnect()
  }
  connackTimer(connackTimer: any) {
    throw new Error('Method not implemented.')
  }

  _sendQueuedPackets () {
    const queue = this.queue

    function deliver () {
      const entry = queue.shift()
      logger('deliver :: entry %o', entry)
      let packet = null

      if (!entry) {
        return
      }

      packet = entry.packet
      logger('deliver :: call _sendPacket for %o', packet)
      let send = true
      if (packet.messageId && packet.messageId !== 0) {
        if (!this.messageIdProvider.register(packet.messageId)) {
          packet.messageeId = this.messageIdProvider.allocate()
          if (packet.messageId === null) {
            send = false
          }
        }
      }
      if (send) {
        this._sendPacket(
          packet,
          function (err) {
            if (entry.cb) {
              entry.cb(err)
            }
            deliver()
          }
        )
      } else {
        logger('messageId: %d has already used.', packet.messageId)
        deliver()
      }
    }

    deliver()
  }

  async publish (topic, message, opts) {
    const result = await handle.publish(this, message)
    return result
  }

  async subscribe (packet) {
    if (!packet.subscriptions) {
      packet = { subscriptions: Array.isArray(packet) ? packet : [packet] }
    }
    const result = await handle.subscribe(this, packet)
    return result
  }

  async unsubscribe (packet) {
    const result = await handle.unsubscribe(this, packet)
    return result
  }

  async end (force, opts) {

    logger('end :: (%s)', this.options.clientId)

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

    logger('end :: cb? %s', !!cb)
    cb = cb || nop

    function closeStores () {
      logger('end :: closeStores: closing incoming and outgoing stores')
      this.disconnected = true
      this.incomingStore.close((e1) => {
        this.outgoingStore.close((e2) => {
          logger('end :: closeStores: emitting end')
          this.emit('end')
          if (cb) {
            const err = e1 || e2
            logger('end :: closeStores: invoking callback with args')
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
      logger('end :: (%s) :: finish :: calling _cleanUp with force %s', that.options.clientId, force)
      that._cleanUp(force, () => {
        logger('end :: finish :: calling process.nextTick on closeStores')
        // var boundProcess = nextTick.bind(null, closeStores)
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
      logger('end :: (%s) :: calling finish in 10ms once outgoing is empty', that.options.clientId)
      this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
    } else {
      logger('end :: (%s) :: immediately calling finish', that.options.clientId)
      finish()
    }

    return this
  }
  outgoing(outgoing: any) {
    throw new Error('Method not implemented.')
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
  removeOutgoingMessage (messageId) {
    const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
    delete this.outgoing[messageId]
    this.outgoingStore.del({ messageId: messageId }, function () {
      cb(new Error('Message removed'))
    })
    return this
  }

  reconnect (opts) {
    logger('client reconnect')
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

  _reconnect () {
    logger('_reconnect: emitting reconnect to client')
    this.emit('reconnect')
    if (this.connected) {
      this.end(() => { this._setupStream() })
      logger('client already connected. disconnecting first.')
    } else {
      logger('_reconnect: calling _setupStream')
      this._setupStream()
    }
  }
  _setupStream() {
    throw new Error('Method not implemented.')
  }

  _setupReconnect () {
    if (!this.disconnecting && !this.reconnectTimer && (this.options.reconnectPeriod > 0)) {
      if (!this.reconnecting) {
        logger('_setupReconnect :: emit `offline` state')
        this.emit('offline')
        logger('_setupReconnect :: set `reconnecting` to `true`')
        this.reconnecting = true
      }
      logger('_setupReconnect :: setting reconnectTimer for %d ms', this.options.reconnectPeriod)
      this.reconnectTimer = setInterval(() => {
        logger('reconnectTimer :: reconnect triggered!')
        this._reconnect()
      }, this.options.reconnectPeriod)
    } else {
      logger('_setupReconnect :: doing nothing...')
    }
  }

  _clearReconnect () {
    logger('_clearReconnect : clearing reconnect timer')
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  async _cleanUp (forced) {
    const opts = arguments[2]
    if (done) {
      logger('_cleanUp :: done callback provided for on stream close')
      this.stream.on('close', done)
    }

    logger('_cleanUp :: forced? %s', forced)
    if (forced) {
      if ((this.options.reconnectPeriod === 0) && this.options.clean) {
        flush(this.outgoing)
      }
      logger('_cleanUp :: (%s) :: destroying stream', this.options.clientId)
      this.stream.destroy()
    } else {
      const packet = xtend({ cmd: 'disconnect' }, opts)
      logger('_cleanUp :: (%s) :: call _sendPacket with disconnect packet', this.options.clientId)
      this._sendPacket(
        packet,
        setImmediate.bind(
          null,
          this.stream.end.bind(this.stream)
        )
      )
    }

    if (!this.disconnecting) {
      logger('_cleanUp :: client not disconnecting. Clearing and resetting reconnect.')
      this._clearReconnect()
      this._setupReconnect()
    }

    if (this.pingTimer !== null) {
      logger('_cleanUp :: clearing pingTimer')
      this.pingTimer.clear()
      this.pingTimer = null
    }

    if (done && !this.connected) {
      logger('_cleanUp :: (%s) :: removing stream `done` callback `close` listener', this.options.clientId)
      this.stream.removeListener('close', done)
      done()
    }
  }

  async _sendPacket (packet) {
    logger('_sendPacket :: (%s) ::  start', this.options.clientId)
    cbStorePut = cbStorePut || nop

    if (!this.connected) {
      logger('_sendPacket :: client not connected. Storing packet offline.')
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
  }
  _shiftPingInterval() {
    throw new Error('Method not implemented.')
  }

  _storePacket (packet) {
    cbStorePut = cbStorePut || nop

    // check that the packet is not a qos of 0, or that the command is not a publish
    if (((packet.qos || 0) === 0 && this.queueQoSZero) || packet.cmd !== 'publish') {
      this.queue.push({ packet: packet, cb: cb })
    } else if (packet.qos > 0) {
      cb = this.outgoing[packet.messageId] ? this.outgoing[packet.messageId].cb : null
      this.outgoingStore.put(packet, function (err) {
        if (err) {
          return cb && cb(err)
        }
        cbStorePut()
      })
    } else if (cb) {
      cb(new Error('No connection to broker'))
    }
  }
}
function eos(conn: any, arg1: any): any {
  throw new Error('Function not implemented.')
}

