import {
  IPacket,
  IConnackPacket,
  IConnectPacket,
  IDisconnectPacket,
  IPublishPacket,
  Packet,
  parser as mqttParser,
  Parser as MqttParser,
} from 'mqtt-packet';
import { write } from './write.js';
import { ConnectOptions } from './interface/connectOptions.js';
import { Duplex } from 'stream';
import { EventEmitter } from 'node:events';
import { connectionFactory } from './connectionFactory/index.js';
import eos from 'end-of-stream';
import { defaultConnectOptions } from './util/constants.js';
import { ReasonCodeErrors } from './util/errors.js';
import { logger } from './util/logger.js';
import { defaultClientId } from './util/defaultClientId.js';
import { PublishPacket } from './interface/packets.js';
import { NumberAllocator } from 'number-allocator';
import { Logger } from 'pino';

function eosPromisified(stream: NodeJS.ReadableStream | NodeJS.WritableStream): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    eos(stream, (err: any) => (err instanceof Error ? reject(err) : resolve()));
  });
}

export class MqttClient extends EventEmitter {
  _incomingPacketParser: MqttParser;
  _options: ConnectOptions;
  disconnecting: any;
  connecting: boolean;
  connected: boolean;
  errored: boolean;
  _eos: Promise<void> | undefined;
  conn: Duplex;
  _clientLogger: Logger;
  /**
   * Use packet ID as key if there is one (e.g., SUBACK)
   * Use packet type as key if there is no packet ID (e.g., CONNACK)
   */
  _inflightPackets: Map<string | number, (err: Error | null, packet: IPacket) => void>;
  private _numberAllocator: NumberAllocator;

  constructor(options: ConnectOptions) {
    super();
    // assume the options have been validated before instantiating the client.
    this.connecting = false;
    this.connected = false;
    this.errored = false;
    this.disconnecting = false;
    this._inflightPackets = new Map();

    // Using this method to clean up the constructor to do options handling
    logger.trace(`populating internal client options object...`);
    this._options = {
      clientId: defaultClientId(),
      ...defaultConnectOptions,
      ...options,
    };

    this._clientLogger = logger.child({ id: this._options.clientId });

    this._numberAllocator = new NumberAllocator(1, 65535);

    this.conn = this._options.customStreamFactory
      ? this._options.customStreamFactory(this._options)
      : connectionFactory(this._options);

    // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
    this.conn.setMaxListeners(1000);

    this._incomingPacketParser = mqttParser(this._options);

    // Handle incoming packets this are parsed
    // NOTE: THis is only handling incoming packets from the
    // readable stream of the conn stream.
    // we need to make sure that the function called on 'packet' is bound to the context of 'MQTTClient'
    this._incomingPacketParser.on('packet', this.handleIncomingPacket.bind(this));

    // Echo connection errors this.emit('clientError')
    // We could look at maybe pushing errors in different directions depending on how we should
    // respond to the different errors.
    this._incomingPacketParser.on('error', (err: any) => {
      this._clientLogger.error(`error in incomingPacketParser.`);
      this.emit('clientError', err);
    });

    this.once('connected', () => {
      this._clientLogger.trace(`client is connected.`);
    });
    this.on('close', () => {
      this._clientLogger.trace(`client is closed.`);
      this.connected = false;
    });

    this.conn.on('readable', () => {
      this._clientLogger.trace(`data available to be read from the 'conn' stream...`);
      let data = this.conn.read();

      while (data) {
        this._clientLogger.trace(`process the data..`);
        // process the data
        this._incomingPacketParser.parse(data);
        data = this.conn.read();
      }
    });

    this.on('clientError', this.onError);
    this.conn.on('error', this.emit.bind(this, 'clientError'));

    this.conn.on('close', () => {
      this.disconnect({ force: false });
    });
    this._eos = eosPromisified(this.conn);
    this._eos.catch((err: any) => {
      this.emit('error', err);
    });
  }

  async handleIncomingPacket(packet: Packet): Promise<void> {
    this._clientLogger.trace(`handleIncomingPacket packet.cmd=${packet.cmd}`);
    switch (packet.cmd) {
      case 'connack': {
        const connackCallback = this._inflightPackets.get('connack');
        if (connackCallback) {
          this._inflightPackets.delete('connack');
          connackCallback(null, packet as IConnackPacket);
        }
        break;
      }
    }
  }

  /**
   * connect
   * @param options
   * @returns
   */
  // TODO: Should this be moved up to the index.ts file, or should it live here?
  public async connect(): Promise<IConnackPacket> {
    logger.trace('sending connect...');
    this.connecting = true;

    const connackPromise = this._awaitConnack();
    const packet: IConnectPacket = {
      cmd: 'connect',
      clientId: this._options.clientId as string,
      protocolVersion: this._options.protocolVersion,
      protocolId: this._options.protocolId,
      clean: this._options.clean,
      keepalive: this._options.keepalive,
      username: this._options.username,
      password: this._options.password,
      will: this._options.will,
      properties: this._options.properties,
    };
    logger.trace(`writing connect...`);
    await write(this, packet);
    logger.trace('waiting for connack...');
    const connack = await connackPromise;
    await this._onConnected(connack);
    this.connecting = false;
    logger.trace('client connected. returning client...');
    return connack;
  }

  /**
   * publish - publish <message> to <topic>
   * Currently only supports QoS 0 Publish
   *
   * @param {PublishPacket} packet - publish packet
   * @returns {Promise<void>} - Promise will be resolved
   * when the message has been sent, but not acked.
   */
  public async publish(packet: PublishPacket): Promise<void> {
    if (!this.connected) {
      throw new Error('client must be connected to publish.');
    }
    // NumberAllocator's firstVacant method has a Time Complexity of O(1).
    // Will return the first vacant number, or null if all numbers are occupied.
    // eslint-disable-next-line @typescript-eslint/ban-types
    const messageId: Number | null = this._numberAllocator.alloc();
    if (messageId === null) {
      logger.error("All messageId's are allocated.");
      this.emit(`error in numberAllocator during publish`);
      return;
    }
    const defaultPublishPacket: IPublishPacket = {
      cmd: 'publish',
      retain: false,
      dup: false,
      messageId: messageId as number,
      qos: 0,
      topic: 'default',
      payload: '',
    };
    const publishPacket: IPublishPacket = {
      ...defaultPublishPacket,
      ...packet,
    };
    this._clientLogger.trace(`publishing packet ${JSON.stringify(publishPacket)}`);
    write(this, publishPacket);

    // deallocate the messageId used.
    this._numberAllocator.free(messageId);
    return;
  }

  private async _destroyClient(force?: boolean) {
    this._clientLogger.trace(`destroying client...`);
    this.conn.removeAllListeners('error');
    this.conn.removeAllListeners('close');
    this.conn.on('close', () => {});
    this.conn.on('error', () => {});

    if (force) {
      this._clientLogger.trace(`force destroying the underlying connection stream...`);
      this.conn.destroy();
    } else {
      this._clientLogger.trace(`gracefully ending the underlying connection stream...`);
      this.conn.end(() => {
        this._clientLogger.trace('END all data has been flushed from stream.');
      });
      // once the stream.end() method has been called, and all the data has been flushed to the underlying system, the 'finish' event is emitted.
      this.conn.once('finish', () => {
        this._clientLogger.trace('all data has been flushed from stream.');
      });
    }
    return this;
  }

  public async disconnect({ force, options = {} }: { force?: boolean; options?: any } = {}): Promise<MqttClient> {
    // if client is already disconnecting, do nothing.
    if (this.disconnecting) {
      this._clientLogger.trace(`client already disconnecting.`);
      return this;
    }

    //
    this.disconnecting = true;

    this._clientLogger.trace('disconnecting client...');
    const packet: IDisconnectPacket = {
      cmd: 'disconnect',
      reasonCode: options.reasonCode,
      properties: options.properties,
    };
    this._clientLogger.trace('writing disconnect...');
    // close the network connection
    // ensure NO control packets are sent on the network connection.
    // disconnect packet is the final control packet sent from the client to the server. It indicates the client is disconnecting cleanly.
    await write(this, packet);

    // once write is done, then switch state to disconnected
    this.connected = false;
    this.connecting = false;
    this._destroyClient(force);
    return this;
  }

  private async _awaitConnack(): Promise<IConnackPacket> {
    return new Promise((resolve, reject) => {
      if (this._inflightPackets.has('connack')) {
        reject(new Error('connack packet callback already exists'));
        return;
      }
      this._inflightPackets.set('connack', (err, packet) => {
        err ? reject(err) : resolve(packet as IConnackPacket);
      });
      let connackTimeout: NodeJS.Timeout | null = setTimeout(() => {
        this._inflightPackets.delete('connack');
        clearTimeout(connackTimeout as NodeJS.Timeout);
        connackTimeout = null;
        reject(new Error('connack packet timeout'));
      }, this._options.connectTimeout);
    });
  }

  private _onConnected(connackPacket: IConnackPacket) {
    logger.trace(`updating client state on connected...`);
    const rc = connackPacket.returnCode;
    if (typeof rc !== 'number') {
      throw new Error('Invalid connack packet');
    }
    if (rc === 0) {
      this.connected = true;
      return;
    } else if (rc > 0) {
      const err: any = new Error('Connection refused: ' + ReasonCodeErrors[rc as keyof typeof ReasonCodeErrors]);
      err.code = rc;
      this.emit('clientError', err);
      throw err;
    }
  }

  onError(err?: Error | null | undefined) {
    this.emit('error', err);
    this.errored = true;
    this.conn.removeAllListeners('error');
    this.conn.on('error', () => {});
    this._destroyClient(true);
  }
}
