'use strict'

import { IConnectPacket, parser as mqttParser, Parser as MqttParser, writeToStream } from 'mqtt-packet'
import { handle } from './handlers'
import { ConnectOptions } from '.'
import { Duplex, EventEmitter } from 'stream'
import { connectionFactory } from './connectionFactory'
import eos from 'end-of-stream'
import { defaultConnectOptions } from './defaultConnectOptions'

// const eventEmitter = require('events')
// const mqttErrors = require('errors')

// const logger = require('pino')()

export class MqttClient extends EventEmitter {
  static isBrowser: boolean // This can be the global check for browser compatibility.
  closed: boolean
  connecting: boolean
  connected: boolean
  errored: boolean
  id: any
  clean?: boolean
  version: any
  protocol: any
  port: any
  hostname: any
  rejectUnauthorized: any
  conn: Duplex
  _reconnectCount: number
  _disconnected: boolean
  _authorized: boolean
  _parser: MqttParser
  _options: any
  _parsingBatch: any
  connackSent: boolean = false
  _queueLimit: any
  queue: any
  options: any
  disconnected: boolean = true
  incomingStore: any
  outgoingStore: any
  _deferredReconnect: any
  disconnecting: any
  reconnectTimer: any
  reconnecting: any
  pingTimer: any
  queueQoSZero: boolean = false
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
  properties?: { sessionExpiryInterval: number; receiveMaximum: number; maximumPacketSize: number; topicAliasMaximum: number; requestResponseInformation: boolean; requestProblemInformation: boolean; userPropertis: any; authenticationMethod: string; authenticationData: BinaryData }
  authPacket: any
  will?: {
    topic: any; payload: any; qos: number; retain: boolean; properties: {
      willDelayInterval: number; payloadFormatIndicator: boolean; messageExpiryInterval: number // eslint-disable-next-line camelcase
      // eslint-disable-next-line camelcase
      // TODO: _isBrowser should be a global value and should be standardized....
      // Connect Information
      contentType: string; responseTopic: string; correlationData: BinaryData; userProperties: any
    }
  }
  transformWsUrl?: (opts: any) => URL
  resubscribe: boolean = false
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
    this.conn = options.customStreamFactory? options.customStreamFactory(options) : connectionFactory(options)

    this._reconnectCount = 0

    this._disconnected = false
    this._authorized = false
    this._parser = mqttParser()

    this._options = options || defaultConnectOptions
    // Loop through the defaultConnectOptions. If there is an option
    // that is a default that has not been provided through the options
    // object passed to the constructor, then update that value with the default Option.
    for (const [key, value] of Object.entries(defaultConnectOptions)) {
      this._options[key] = this._options[key] ?? value 
    }
    this._options.clientId = options.clientId || `mqttjs_ ${Math.random().toString(16).substr(2, 8)}`
    this._parser.on('packet', this.enqueue)
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

  private _sendConnect(): Promise<void> {
    const packet: IConnectPacket  = {
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
    
    this.emit('packetsend', packet)
    return new Promise<void>((resolve, reject) => {
      try {
        setImmediate(() => {
          writeToStream(packet, this._options.conn, this._options._options)
          resolve()
        })
      } catch (e) {
        reject(e)
      }
    });
  }

  close (_done: any) {
  }

  onError (_err: any) {
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

  async enqueue (packet: string) {
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
    if (q) {
      for (let i = 0, len = q.length; i < len; i++) {
        const result = await handle(this, q[i])
        this.nextBatch(result)
      }
    }
    this.parserQueue = null
  }

  nextBatch (err: void) {
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
      const buf = this.conn.read(null)
      if (buf) {
        this._parser.parse(buf)
      }
    }
  }




  deliver0 = function deliverQoS0 (_packet: any, _cb: any) {
  }

  _closeClient () {
  }

  connackTimer(_connackTimer: any) {
    throw new Error('Method not implemented.')
  }

  _sendQueuedPackets () {
  }

  async publish (_topic: any, message: string, _opts: any) {
    const result = await handle(this, message)
    return result
  }

  async subscribe (_packet: any) {
  }

  async unsubscribe (_packet: any) {
  }

  async end (_force: any, _opts: any) {
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