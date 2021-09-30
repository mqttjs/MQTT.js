'use strict'

import { IConnectPacket, IPingreqPacket, Packet, parser as mqttParser, Parser as MqttParser, writeToStream } from 'mqtt-packet'
import { handleInboundPackets, handleOutgoingPackets } from './handlers'
import { ConnectOptions } from '.'
import { Duplex, EventEmitter } from 'stream'
import { connectionFactory } from './connectionFactory'
import eos from 'end-of-stream'
import { defaultConnectOptions } from './defaultConnectOptions'

// const eventEmitter = require('events')
// const mqttErrors = require('errors')

const logger = require('pino')()

export class MqttClient extends EventEmitter {
  static isBrowser: boolean // This can be the global check for browser compatibility.
  _parser: MqttParser
  _options: ConnectOptions
  connackSent: boolean = false
  disconnected: boolean = true
  incomingStore: any
  outgoingStore: any
  disconnecting: any
  reconnectTimer: any
  reconnecting: any
  pingTimer: any
  queueQoSZero: boolean = false
  connackTimer: any | undefined
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
  authPacket: any
  resubscribe: boolean = false
  messageIdProvider: any
  parserQueue: Packet[] | null
  private _paused: any
  closed: boolean
  connecting: boolean
  connected: boolean
  errored: boolean
  id: null
  clean: boolean
  version: null
  conn: Duplex
  _reconnectCount: number
  _disconnected: boolean
  _authorized: boolean
  _eos: () => void
  _parsingBatch: any
  pingResp: boolean | null

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
    this.pingResp = null
    // eslint-disable-next-line camelcase
    // TODO: _isBrowser should be a global value and should be standardized....

    // Using this method to clean up the constructor to do options handling 
    this._options = options || defaultConnectOptions

    this.conn = this._options.customStreamFactory? this._options.customStreamFactory(this._options) : connectionFactory(this._options)
    // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
    this.conn.setMaxListeners(1000)

    this._reconnectCount = 0

    this._disconnected = false
    this._authorized = false
    this._parser = mqttParser()

    // Loop through the defaultConnectOptions. If there is an option
    // that is a default that has not been provided through the options
    // object passed to the constructor, then update that value with the default Option.
    for (const [key, value] of Object.entries(defaultConnectOptions)) {
      // TODO: This type coersion is bad. How can I make it better?
      (this._options as any)[key] = this._options[key as keyof ConnectOptions] ?? value 
    }
    this._options.clientId = options.clientId || `mqttjs_ ${Math.random().toString(16).substr(2, 8)}`
    this._parser.on('packet', this.enqueue)
    // Echo connection errors
    this._parser.on('error', this.emit.bind(this, 'error'))

    this.once('connected', this.dequeue)
    this.on('close', this._closeClient)

    this.conn.on('readable', this.nextBatch)

    this.on('error', this.onError)
    this.conn.on('error', this.emit.bind(this, 'error'))
    this._parser.on('error', this.emit.bind(this, 'error'))
  
    this.conn.on('end', this.close.bind(this))
    this._eos = eos(this.conn, this.close.bind(this))

  }

  public static async connect(options: ConnectOptions) {
    const client = new MqttClient(options)
    await client._sendConnect()
    await client._sendAuth()
    return client
  }

  /**
   * _shiftPingInterval - reschedule the ping interval
   *
   * @api private
   */
  _shiftPingInterval () {
    if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
      this.pingTimer.reschedule(this.options.keepalive * 1000)
    }
  }

  /**
   * _checkPing - check if a pingresp has come back, and ping the server again
   *
   * @api private
   */
  _checkPing () {
    logger('_checkPing :: checking ping...')
    if (this.pingResp) {
      logger('_checkPing :: ping response received. Clearing flag and sending `pingreq`')
      this.pingResp = false
      const pingPacket: IPingreqPacket = { cmd: 'pingreq' }
      handle(this, pingPacket)
    } else {
      // do a forced cleanup since socket will be in bad shape
      logger('_checkPing :: calling _cleanUp with force true')
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


  private _sendAuth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (
        this._options.properties && 
        this._options.properties.authenticationMethod && 
        this._options.authPacket && 
        typeof this._options.authPacket === 'object') {
          var authPacket = {cmd: 'auth', reasonCode: 0, ...this._options.authPacket}
          try {
            // TODO: Should we worry about the 'drain' event?? See old code.      
            // If a call to stream.write(chunk) returns false, the 'drain' event will
            // be emitted when it is appropriate to resume writing data to the stream.
            writeToStream(authPacket, this.conn, this._options)
            resolve()
          } catch (e) {
            reject (e)
          }}
    })
  }

  private async _sendConnect(): Promise<void> {
    const connectPacket: IConnectPacket  = {
      cmd: 'connect',
      clientId: this._options.clientId,
      protocolVersion: this._options.protocolVersion,
      protocolId: this._options.protocolId,
      clean: this._options.clean,
      keepalive: this._options.keepalive,
      username: this._options.username,
      password: this._options.password,
      will: this._options.will,
      properties: this._options.properties
    }

    const connectResult = await handleOutgoingPackets(this, connectPacket)
    // auth
    if (this._options.properties) {
      if (!this._options.properties.authenticationMethod && this._options.properties.authenticationData) {
        this.end(() =>
          this.emit('error', new Error('Packet has no Authentication Method')
          ))
        return
        }
      if (this._options.properties.authenticationMethod && this._options.authPacket && typeof this.options.authPacket === 'object') {
        var authPacket = {cmd: 'auth', reasonCode: 0, ...this._options.authPacket}
        writeToStream(authPacket, this.conn, this._options)
      }
    }
  }

  close (_done: any) {
  }

  onError (_err: any) {
  }

  async enqueue (packet: Packet) {
    this._parsingBatch++
    // already connected or it's the first packet
    if (this.connackSent || this._parsingBatch === 1) {
      const result = await handleOutgoingPackets(this, packet)
      this.nextBatch(result)
    } else {
      if (this.parserQueue.length < this._options.queueLimit) {
        this.parserQueue.push(packet)
      } else {
        this.emit('error', new Error('Client queue limit reached'))
      }
    }
  }

  async dequeue () {
    const q = this.parserQueue
    if (q) {
      // This will loop through all of the packets stored in the ParserQueue
      // If there are errors while sending any of the packets an error will be
      // emitted but it will continue through the queue.
      for (let i = 0, len = q.length; i < len; i++) {
        let err: Error | undefined
        try {
          await handleOutgoingPackets(this, q[i])
        } catch (e) {
          this.emit('error', err)
        }
        this.nextBatch()
      }
    }
    this.parserQueue = null
  }

  nextBatch () {
    // NOTE: removed error checking for nextbatch. Should be 
    // handled before this function is called from now on.
    if (this._paused) {
      return
    }

    this._parsingBatch--
    if (this._parsingBatch <= 0) {
      this._parsingBatch = 0
      // The readable.read() method pulls some data out of the internal buffer
      // and returns it. If no data available to be read, null is returned.
      const buf = this.conn.read()
      if (buf) {
        this._parser.parse(buf)
      }
    }
  }




  deliver0 = function deliverQoS0 (_packet: any, _cb: any) {
  }

  _closeClient () {
  }

  _sendQueuedPackets () {
  }

  async publish (topic: any, message: string, opts: any) {
    const defaultPublishOpts = {qos: 0, retain: false, dup: false}
    const publishOpts = {...defaultPublishOpts, ...opts}
    const result = await handle(this, message)
    return result
  }

  async subscribe (packet: any) {
    return new Error('subscribe is not implemented.')
  }

  async unsubscribe (packet: any) {
    return new Error('unsubscribe is not implemented.')
  }

  async end (force?: any, opts?: any) {
    return new Error('end is not implemented.')
  }

  outgoing(_outgoing: any) {
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
  removeOutgoingMessage (messageId: string | number) {
    const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
    delete this.outgoing[messageId]
    this.outgoingStore.del({ messageId: messageId }, function () {
      cb(new Error('Message removed'))
    })
    return this
  }

  reconnect (_opts: any) {
  }

  _setupReconnect () {
  }

  _clearReconnect () {
  }

  async _cleanUp (_forced: any) {
  }

  _storePacket (_packet: any) {
  }
}