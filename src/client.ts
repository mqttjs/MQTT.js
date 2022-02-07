import { IConnackPacket, IConnectPacket, Packet, parser as mqttParser, Parser as MqttParser, writeToStream } from 'mqtt-packet'
import { write } from './write.js'
import { ConnectOptions } from './interfaces/connectOptions.js'
import { Duplex } from 'stream'
import { EventEmitter } from 'node:events'
import { connectionFactory } from './connectionFactory/index.js'
import eos from 'end-of-stream'
import { defaultConnectOptions } from './utils/constants.js'
import { ReasonCodeErrors } from './errors.js'
import { logger } from './utils/logger.js'
import { defaultClientId } from './utils/defaultClientId.js'

function eosPromisified(stream: NodeJS.ReadableStream | NodeJS.WritableStream): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    eos(stream, err => err instanceof Error ? reject(err) : resolve());
  })
}

// call close(done) after the stream has closed () => void
// call await close()

export class MqttClient extends EventEmitter {
  _incomingPacketParser: MqttParser
  _options: ConnectOptions
  connacked: boolean = false
  disconnected: boolean = true
  disconnecting: any
  pingTimer: any
  queueQoSZero: boolean = false
  keepalive: any
  reschedulePings: any
  clientId: any
  protocolId: any
  protocolVersion: any
  connectTimeout: any
  username: any
  password: any
  resubscribe: boolean = false
  messageIdProvider: any
  parserQueue: Packet[] | null
  closed: boolean
  connecting: boolean
  connected: boolean
  errored: boolean
  id: null
  _eos: Promise<void> | undefined
  clean: boolean
  version: null
  conn: Duplex
  _disconnected: boolean
  _parsingBatch: number = 0
  pingResp: boolean | null
  inflightMessagesThatNeedToBeCleanedUpIfTheConnCloses: {[x: string]: any}
  storeProcessingQueue: any[]
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
      const promise = new Promise<void>((res) => {
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

    // Using this method to clean up the constructor to do options handling 
    this._options = {...defaultConnectOptions, ...options}

    this.conn = this._options.customStreamFactory? this._options.customStreamFactory(this._options) : connectionFactory(this._options);
  
    // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
    this.conn.setMaxListeners(1000)


    this._disconnected = false
    this._incomingPacketParser = mqttParser(this._options)

    // Handle incoming packets this are parsed
    // NOTE: THis is only handling incoming packets from the 
    // readable stream of the conn stream. 
    this._incomingPacketParser.on('packet', this.handleIncomingPacket)

    // Echo connection errors this.emit('clientError')
    // We could look at maybe pushing errors in different directions depending on how we should
    // respond to the different errors.
    this._incomingPacketParser.on('error', () => this.emit('clientError'));

    this.once('connected', () => {})
    this.on('close', () => {
      this.connected = false
    })

    this.conn.on('readable', () => {
      let data

      while (data = this.conn.read()) {
        // process the data
        this._incomingPacketParser.parse(data)
      }
    })

    this.on('clientError', this.onError)
    this.conn.on('error', this.emit.bind(this, 'clientError'))
  
    this.conn.on('end', () => { this.close() });
    this._eos = eosPromisified(this.conn);
    this._eos.catch((err: any) => {
      this.emit('error', err);
    })
  }

  mergeDefaultOptions(options: ConnectOptions): ConnectOptions {
    return {clientId: defaultClientId(), ...defaultConnectOptions, ...options}
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
    logger.info('creating new client...')
    const client = new MqttClient(options)
    logger.info('sending connect...')
    client.connecting = true
    const connackPromise = client._awaitConnack()
    await write(client, createConnectPacket(client._options))
    logger.info('waiting for connack...')
    const connack = await connackPromise
    client._onConnected(connack)
    client.connecting = false
    logger.info('client connected. returning client...')
    return client
  }

  async _cleanUp(forced?: boolean, opts?: any) {
    if (forced) {
      this.conn.destroy()
    } else {
      let packet = { cmd: 'disconnect' , ...opts}

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
  
  
    if (this.pingTimer !== null) {
      this.pingTimer.clear()
      this.pingTimer = null
    }
  
    if (!this.connected) {
      this.conn.removeListener('close', () => {})
      return 

    }
  }

  private _awaitConnack(): Promise<IConnackPacket> {
    return new Promise((resolve, reject) => {
      const connackTimeout = setTimeout(
        () => { reject(new Error('Connection timed out')) },
        this._options.connectTimeout
      )

      this.once('connack', (connackPacket: IConnackPacket) => {
        clearTimeout(connackTimeout)
        resolve(connackPacket)
      })
    })
  }

  private _onConnected(connackPacket: IConnackPacket) {
    const rc = connackPacket.returnCode
    if (typeof rc !== 'number') {
      throw new Error('Invalid connack packet');
    }
    if (rc === 0) {
      this.connected = true
      return
    } else if (rc > 0) {
      const err:any = new Error('Connection refused: ' + ReasonCodeErrors[rc as keyof typeof ReasonCodeErrors])
      err.code = rc
      this.emit('clientError', err)
      throw err
    }
  }

  async close(_error?: Error | null | undefined): Promise<void> {
    // empty right now
  }

  onError (err?: Error | null | undefined) {
    this.emit('error', err);
    this.errored = true;
    this.conn.removeAllListeners('error');
    this.conn.on('error', () => {});
    this.close()
  }

  sendPacket(packet: Packet) {
    this.emit('packetsend', packet)
    writeToStream(packet, this.conn, this._options)
  }

  async end (force?: boolean, opts?: any) {  
  
    const finish = async () => {
      // defer closesStores of an I/O cycle,
      // just to make sure things are
      // ok for websockets
      await this._cleanUp(force, opts);
    }
  
    if (this.disconnecting) {
      return this
    }
    
    this.disconnecting = true
  
    if (!force && Object.keys(this.outgoing).length > 0) {
      // wait 10ms, just to be sure we received all of it
      this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
    } else {
      finish()
    }
  
    return this
  }
}

function createConnectPacket(options: ConnectOptions): IConnectPacket {
  const packet: IConnectPacket  = {
    cmd: 'connect',
    clientId: options.clientId as string,
    protocolVersion: options.protocolVersion,
    protocolId: options.protocolId,
    clean: options.clean,
    keepalive: options.keepalive,
    username: options.username,
    password: options.password,
    will: options.will,
    properties: options.properties
  }
  return packet
}