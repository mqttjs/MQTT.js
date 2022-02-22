import { IConnackPacket, IConnectPacket, IDisconnectPacket, Packet, parser as mqttParser, Parser as MqttParser } from 'mqtt-packet'
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
    eos(stream, (err: any) => err instanceof Error ? reject(err) : resolve());
  })
}

export class MqttClient extends EventEmitter {
  _incomingPacketParser: MqttParser
  _options: ConnectOptions
  disconnecting: any
  connecting: boolean
  connected: boolean
  errored: boolean
  _eos: Promise<void> | undefined
  conn: Duplex


  constructor(options: ConnectOptions) {
    super()
    // assume the options have been validated before instantiating the client.
    this.connecting = false
    this.connected = false
    this.errored = false
    this.disconnecting = false

    // Using this method to clean up the constructor to do options handling 
    logger.debug(`populating internal client options object...`);
    this._options = {
      clientId: defaultClientId(),
      ...defaultConnectOptions,
      ...options
    }

    this.conn = this._options.customStreamFactory? this._options.customStreamFactory(this._options) : connectionFactory(this._options);
  
    // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
    this.conn.setMaxListeners(1000)

    this._incomingPacketParser = mqttParser(this._options)

    // Handle incoming packets this are parsed
    // NOTE: THis is only handling incoming packets from the 
    // readable stream of the conn stream. 
    // we need to make sure that the function called on 'packet' is bound to the context of 'MQTTClient'
    this._incomingPacketParser.on('packet', this.handleIncomingPacket.bind(this))

    // Echo connection errors this.emit('clientError')
    // We could look at maybe pushing errors in different directions depending on how we should
    // respond to the different errors.
    this._incomingPacketParser.on('error', (err: any) => {
      logger.error(`error in incomingPacketParser.`)
      this.emit('clientError', err)
    });

    this.once('connected', () => {
      logger.debug(`client is connected.`);
    })
    this.on('close', () => {
      logger.debug(`client is closed.`);
      this.connected = false
    })

    this.conn.on('readable', () => {
      logger.debug(`data available to be read from the 'conn' stream...`);
      let data

      while (data = this.conn.read()) {
        logger.debug(`process the data..`);
        // process the data
        this._incomingPacketParser.parse(data)
      }
    })

    this.on('clientError', this.onError)
    this.conn.on('error', this.emit.bind(this, 'clientError'))
  
    this.conn.on('close', () => { this.disconnect({ force: false }) });
    this._eos = eosPromisified(this.conn);
    this._eos.catch((err: any) => {
      this.emit('error', err);
    })
  }

  async handleIncomingPacket(packet: Packet): Promise<void> {
    logger.debug(`handleIncomingPacket packet.cmd=${packet.cmd}`);
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
    logger.debug('creating new client...')
    const client = new MqttClient(options)
    logger.debug('sending connect...')
    client.connecting = true
    const connackPromise = client._awaitConnack()
    const packet: IConnectPacket = {
      cmd: 'connect',
      clientId: client._options.clientId as string,
      protocolVersion: client._options.protocolVersion,
      protocolId: client._options.protocolId,
      clean: client._options.clean,
      keepalive: client._options.keepalive,
      username: client._options.username,
      password: client._options.password,
      will: client._options.will,
      properties: client._options.properties
    }
    await write(client, packet)
    logger.debug('waiting for connack...')
    const connack = await connackPromise
    client._onConnected(connack)
    client.connecting = false
    logger.debug('client connected. returning client...')
    return client
  }

  public async disconnect({ force, options = {} }: { force?: boolean; options?: any } = {}): Promise<MqttClient> {
    // if client is already disconnecting, do nothing.
    if (this.disconnecting) {
      logger.debug(`client already disconnecting.`)
      return this
    }

    // 
    this.disconnecting = true
    
    this.conn.removeAllListeners('error')
    this.conn.on('error', () => {})

    logger.debug('disconnecting client...')
    const packet: IDisconnectPacket = {
      cmd: 'disconnect',
      reasonCode: options.reasonCode,
      properties: options.properties
    }
    logger.debug('writing disconnect...')
    // close the network connection
    // ensure NO control packets are sent on the network connection.
    // disconnect packet is the final control packet sent from the client to the server. It indicates the client is disconnecting cleanly.
    await write(this, packet)

    // once write is done, then switch state to disconnected
    this.connected = false
    this.connecting = false
    
    if (force) {
      this.conn.destroy()
    } else {
      this.conn.end()
      // once the stream.end() method has been called, and all the data has been flushed to the underlying system, the 'finish' event is emitted.
      this.conn.once('finish', () => {
        logger.debug('all data has been flushed from stream.')
        this.emit('')
      })
    }
    return this
  }

  private _awaitConnack(): Promise<IConnackPacket> {
    logger.debug(`in awaitConnect. setting connackTimeout.`);
    return new Promise((resolve, reject) => {
      const connackTimeout = setTimeout(
          () => { reject(new Error('Connection timed out')) },
          this._options.connectTimeout
      );
      logger.debug(`listening for 'connack'`);
      this.once('connack', (connackPacket: IConnackPacket) => {
        logger.debug(`connack received. clearing connackTimeout...`);
        clearTimeout(connackTimeout);
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

  onError(err?: Error | null | undefined) {
    this.emit('error', err);
    this.errored = true;
    this.conn.removeAllListeners('error');
    this.conn.on('error', () => {});
    this.disconnect({ force: true })
  }
}