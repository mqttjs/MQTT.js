'use strict'

import { IAuthPacket, IConnackPacket, IConnectPacket, IDisconnectPacket, IPingreqPacket, IPingrespPacket, IPubackPacket, IPubcompPacket, IPublishPacket, IPubrecPacket, IPubrelPacket, ISubackPacket, ISubscribePacket, IUnsubackPacket, IUnsubscribePacket, Packet, parser as mqttParser, Parser as MqttParser, writeToStream } from 'mqtt-packet'
import { ConnectionRefusedError, handle } from './handlers'
import { ConnectOptions } from '.'
import { Duplex, EventEmitter, Readable } from 'stream'
import { connectionFactory } from './connectionFactory'
import eos from 'end-of-stream'
import { defaultConnectOptions } from './defaultConnectOptions'
import { applyTopicAlias, write } from './write'
import { ReasonCodeErrors } from './errors'
import {TopicAliasSend} from './topicAliasSend'
import {TopicAliasRecv} from './topicAliasRecv'
import rfdc from 'rfdc'
import { debug } from 'console'
import { Store } from './store'
import { nextTick } from 'process'

const clone = rfdc()

// const eventEmitter = require('events')
// const mqttErrors = require('errors')

const logger = require('pino')()

export class MqttClient extends EventEmitter {
  _incomingPacketParser: MqttParser
  _options: ConnectOptions
  connacked: boolean = false
  disconnected: boolean = true
  incomingStore: Store
  outgoingStore: Store
  disconnecting: any
  reconnectTimer: any
  reconnecting: any
  pingTimer: any
  queueQoSZero: boolean = false
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
  _parsingBatch: number = 0
  pingResp: boolean | null
  topicAliasSend?: TopicAliasSend
  inflightMessagesThatNeedToBeCleanedUpIfTheConnCloses: {[x: string]: any}
  storeProcessingQueue: any[]
  topicAliasRecv: TopicAliasRecv
  messageIdToTopic: {[x: string]: string[]}
  resubscribeTopics: {[x: string]: any}
  connectedPromise: () => Promise<void>
  _storeProcessingQueue: any[]
  outgoing: {[x:string]: any}



  constructor (options: ConnectOptions) {
    super()
    // assume this the options have been validated before instantiating the client.
    this.closed = false
    this.connecting = false
    this.connected = false
    this.connectedPromise = () => { 
      const promise = new Promise<void>((res, rej) => {
        if (this.connected) {
          res()
        } else {
          this.once('connected', res)
        }
      });
      return promise
    }
    this.errored = false
    this.id = null
    this.clean = true
    this.version = null
    this.parserQueue = []
    this.pingResp = null
    this.inflightMessagesThatNeedToBeCleanedUpIfTheConnCloses = {}
    this.storeProcessingQueue = []
    this.messageIdToTopic = {}
    this.resubscribeTopics = {}
    this._storeProcessingQueue = []
    this.outgoing = {}



    
    // eslint-disable-next-line camelcase
    // TODO: _isBrowser should be a global value and should be standardized....

    // Using this method to clean up the constructor to do options handling 
    this._options = options || defaultConnectOptions

    
    // Loop through the defaultConnectOptions. If there is an option
    // this is a default this has not been provided through the options
    // object passed to the constructor, then update this value with the default Option.
    for (const [key, value] of Object.entries(defaultConnectOptions)) {
      // TODO: This type coersion is bad. How can I make it better?
      (this._options as any)[key] = this._options[key as keyof ConnectOptions] ?? value 
    }
    this._options.clientId = options.clientId || `mqttjs_ ${Math.random().toString(16).substr(2, 8)}`
    this._options.customHandleAcks = (options.protocolVersion === 5 && options.customHandleAcks) ? options.customHandleAcks : function () { arguments[3](0) }
    
    this.conn = this._options.customStreamFactory? this._options.customStreamFactory(this._options) : connectionFactory(this._options)
    this.topicAliasRecv = new TopicAliasRecv(this._options.topicAliasMaximum)

    this.outgoingStore = options.outgoingStore || new Store()
    this.incomingStore = options.incomingStore || new Store()

    // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
    this.conn.setMaxListeners(1000)

    this._reconnectCount = 0

    this._disconnected = false
    this._authorized = false
    this._incomingPacketParser = mqttParser(this._options)

    // Handle incoming packets this are parsed
    // NOTE: THis is only handling incoming packets from the 
    // readable stream of the conn stream. 
    this._incomingPacketParser.on('packet', this.handleIncomingPacket)

    // Echo connection errors
    this._incomingPacketParser.on('error', this.emit.bind(this, 'error'))

    this.once('connected', () => {})
    this.on('close', () => {
      debug('close :: connected set to `false`')
      this.connected = false
  
      if (this.topicAliasRecv) {
        this.topicAliasRecv.clear()
      }
  
      debug('close :: calling _setupReconnect')
      this._setupReconnect()
    })

    this.conn.on('readable', () => {
      let data

      while (data = this.conn.read()) {
        // process the data
        this._incomingPacketParser.parse(data)
      }
    })

    this.on('error', this.onError)
    this.conn.on('error', this.emit.bind(this, 'error'))
  
    this.conn.on('end', this.close.bind(this))
    this._eos = eos(this.conn, this.close.bind(this))

  }

  async handleIncomingPacket (packet: Packet): Promise<void> {
    switch (packet.cmd) {
      case 'connack':
        this.emit('connack', packet)
        break;
    }
  }

  /**
   * connect
   * @param options 
   * @returns 
   */
  public static async connect(options: ConnectOptions): Promise<MqttClient> {
    const client = new MqttClient(options)
    await client._sendConnect()
    const connackPromise = client.waitForConnack() // client.createAPromiseTimeoutThatResolvesOnConnack()
    if (client._options.properties && client._options.properties.authenticationMethod
      && client._options.authPacket && typeof client._options.authPacket === 'object') {
        await client._sendAuth()
      }
    const connack: IConnackPacket = await connackPromise
    await client._onConnected(connack)
    
    return client
  }

  async _cleanUp(forced?: boolean, opts?: any) {
    if (forced) {
      if ((this._options.reconnectPeriod === 0) && this._options.clean) {
        Object.keys(this.inflightMessagesThatNeedToBeCleanedUpIfTheConnCloses).forEach((messageId) => {
          if (typeof this.inflightMessagesThatNeedToBeCleanedUpIfTheConnCloses[messageId].cb === 'function') {
            this.inflightMessagesThatNeedToBeCleanedUpIfTheConnCloses[messageId].cb(new Error('Connection closed'))
            delete this.inflightMessagesThatNeedToBeCleanedUpIfTheConnCloses[messageId]
          }
        })      }
      this.conn.destroy()
    } else {
      let packet = { cmd: 'disconnect' , ...opts}
      applyTopicAlias(this, packet)

      if (!this.connected) {
        const deferred: any = {
          promise: null,
          resolve: null,
          reject: null
        }
        deferred.promise = new Promise((resolve, reject) => {
           deferred.resolve = resolve;
           deferred.reject = reject;  
        });
        setImmediate.bind(null, this.conn.end.bind(this.conn))
        return
      }
      this.emit('packetsend', packet)
      writeToStream(packet, this.conn, this._options)
      setImmediate.bind(null, this.conn.end.bind(this.conn))
    }
  
    if (!this.disconnecting) {
      this._clearReconnect()
      this._setupReconnect()
    }
  
    if (this.pingTimer !== null) {
      this.pingTimer.clear()
      this.pingTimer = null
    }
  
    if (!this.connected) {
      logger('_cleanUp :: (%s) :: removing stream `done` callback `close` listener', this._options.clientId)
      this.conn.removeListener('close', () => {})
      return 

    }
  }

  private async _sendAuth(): Promise<void> {
      if (
        this._options.properties && 
        !this._options.properties.authenticationMethod && 
        this._options.properties.authenticationData) {
          const authPacket = {cmd: 'auth', reasonCode: 0, ...this._options.authPacket}
          // TODO: Should we worry about the 'drain' event?? See old code.      
          // If a call to stream.write(chunk) returns false, the 'drain' event will
          // be emitted when it is appropriate to resume writing data to the stream.
          writeToStream(authPacket, this.conn, this._options)
  }
}

  private waitForConnack(): Promise<IConnackPacket> {
    return new Promise((res, rej) => {
      const connectionTimeout = () => {
        rej('CONNECTION TIMEOUT')
      }
      const connackTimer = setTimeout(connectionTimeout, this._options.connectTimeout)
      this.on('connack', (connackPacket) => {
        this.removeListener('connack', res)
        clearTimeout(connackTimer)
        res(connackPacket)
      })
    })
  }

  private async _onConnected(connackPacket: IConnackPacket): Promise<void> {
    delete this.topicAliasSend

    if (connackPacket.properties) {
      if (connackPacket.properties.topicAliasMaximum) {
        if (connackPacket.properties.topicAliasMaximum > 0xffff) {
          const err = new Error('topicAliasMaximum from broker is out of range')
          this.emit('error', err)
          throw err
        }
        if (connackPacket.properties.topicAliasMaximum > 0) {
          this.topicAliasSend = new TopicAliasSend(connackPacket.properties.topicAliasMaximum)
        }
      }

      if (connackPacket.properties.maximumPacketSize) {
        if (!this._options.properties) { this._options.properties = {} }
        this._options.properties.maximumPacketSize = connackPacket.properties.maximumPacketSize
      }
    }

    const rc: number = (this._options.protocolVersion === 5 ? connackPacket.reasonCode : connackPacket.returnCode) as number
    if (rc === 0) {
      this.reconnecting = false
      return 
    } else if (rc > 0) {
      const err = new ConnectionRefusedError('Connection refused: ' + ReasonCodeErrors[rc as keyof typeof ReasonCodeErrors])
      err.code = rc
      this.emit('error', err)
      throw err
    }

    let outStore: Readable | null = await this.outgoingStore.createStream()
    const clearStoreProcessing = () => {
    }

    this.once('close', () => {
      if (outStore) {
        outStore.destroy()
        clearStoreProcessing()
      }
    })
    outStore.on('error', (err) => {
      clearStoreProcessing()
      this.removeListener('close', remove)
      this.emit('error', err)
    })

    const remove = () => {
      if (outStore) {
        outStore.destroy()
        outStore = null
        clearStoreProcessing()
      }
    }
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
  
      await write(this, connectPacket)
  }

  close (_done: any) {
  }

  onError (_err: any) {
  }

  sendPacket(packet: Packet) {
    this.emit('packetsend', packet)
    writeToStream(packet, this.conn, this._options)
  }

  _clearReconnect (): boolean {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
      return true
    }
    return false
  }

  _setupReconnect (): void {
    if (this.disconnecting && this.reconnectTimer && (this._options.reconnectPeriod > 0)) {
      if (!this.reconnecting) {
        this.emit('offline')
        this.reconnecting = true
      }
      this.reconnectTimer = setInterval(() => {
        this._reconnect(), this._options.reconnectPeriod
      })
    } 
  }

  /**
   * This is necessary as a method call even from the user. If the client is ever disconnected, they can manually call this, because
   * there is no exposed 'connect' method that doesn't create a new client. 
   */
  async _reconnect (): Promise<void> {
    this.emit('reconnect')
    this._clearReconnect()
    if (this.connected) {
      await this.end()
    }
    
    this.conn = this._options.customStreamFactory? this._options.customStreamFactory(this._options) : connectionFactory(this._options)
    this.conn.setMaxListeners(1000)
    this.conn.on('readable', () => {
      let data

      while (data = this.conn.read()) {
        // process the data
        this._incomingPacketParser.parse(data)
      }
    })

    this.on('error', this.onError)
    this.conn.on('error', this.emit.bind(this, 'error'))
  
    this.conn.on('end', this.close.bind(this))
    this._eos = eos(this.conn, this.close.bind(this))
    await this._sendConnect()
    const connackPromise = this.waitForConnack()
    if (this._options.properties && this._options.properties.authenticationMethod 
      && this._options.authPacket && typeof this._options.authPacket === 'object') {
        await this._sendAuth()
      } 
    const connack: IConnackPacket = await connackPromise
    await this._onConnected(connack)
  }

  removeTopicAliasAndRecoverTopicName (packet: IPublishPacket): void {
    let alias
    if (packet.properties) {
      alias = packet.properties.topicAlias
    }
  
    let topic = packet.topic.toString()
    if (topic.length === 0) {
      // restore topic from alias
      if (typeof alias === 'undefined') {
        throw new Error('Unregistered Topic Alias')
      } else {
        topic = this.topicAliasSend?.getTopicByAlias(alias)
        if (typeof topic === 'undefined') {
          throw new Error('Unregistered Topic Alias')
        } else {
          packet.topic = topic
        }
      }
    }
    if (alias) {
      delete packet.properties?.topicAlias
    }
  }

  async end (force?: boolean, opts?: any) {  
    const closeStores = async () => {
      logger('end :: closeStores: closing incoming and outgoing stores')
      this.disconnected = true
      try {
        await this.incomingStore.close();
        await this.outgoingStore.close();
      } catch (e) {
        logger(`error closing stores: ${e}`)
      }
      this.emit('end')
    }
  
    const finish = async () => {
      // defer closesStores of an I/O cycle,
      // just to make sure things are
      // ok for websockets
      logger('end :: (%s) :: finish :: calling _cleanUp with force %s', this._options.clientId, force)
      await this._cleanUp(force, opts);
      nextTick(closeStores.bind(this))
    }
  
    if (this.disconnecting) {
      return this
    }
  
    this._clearReconnect()
  
    this.disconnecting = true
  
    if (!force && Object.keys(this.outgoing).length > 0) {
      // wait 10ms, just to be sure we received all of it
      logger('end :: (%s) :: calling finish in 10ms once outgoing is empty', this._options.clientId)
      this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
    } else {
      debug('end :: (%s) :: immediately calling finish', this._options.clientId)
      finish()
    }
  
    return this
  }
}