import {
  IConnackPacket,
  IConnectPacket,
  IDisconnectPacket,
  IPublishPacket,
  parser as mqttParser,
  Parser as MqttParser,
} from 'mqtt-packet';
import { write } from './write.js';
import { ClientOptions } from './interface/clientOptions.js'
import { Duplex } from 'node:stream';
import { Socket } from 'node:net';
import { EventEmitter } from 'node:events';
import { connectionFactory } from './connectionFactory/index.js';
import eos from 'end-of-stream';
import { logger } from './util/logger.js';
import { Logger } from 'pino';
import { MqttPacketSequencer } from './sequencer.js';

function eosPromisified(stream: NodeJS.ReadableStream | NodeJS.WritableStream): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    eos(stream, (err: any) => (err instanceof Error ? reject(err) : resolve()));
  });
}

export class MqttClient extends EventEmitter {
  private _incomingPacketParser: MqttParser;
  private _options: ClientOptions;
  private _disconnecting: boolean;
  private _connecting: boolean;
  private _connected: boolean;
  private _errored: boolean;
  private _eos: Promise<void> | undefined;
  private _conn: Duplex | Socket;
  private _clientLogger: Logger;
  private _packetSequencer: MqttPacketSequencer;

  constructor(options: ClientOptions) {
    super();
    // assume the options have been validated before instantiating the client.
    this._options = options;
    this._connecting = false;
    this._connected = false;
    this._errored = false;
    this._disconnecting = false;
    this._packetSequencer = new MqttPacketSequencer(this._options, write.bind(null, this));

    this._clientLogger = logger.child({ id: this._options.clientId });

    this._conn = this._options.customStreamFactory
      ? this._options.customStreamFactory(this._options)
      : connectionFactory(this._options);

    // many drain listeners are needed for qos 1 callbacks if the connection is intermittent
    this._conn.setMaxListeners(1000);

    this._incomingPacketParser = mqttParser(this._options);

    this._incomingPacketParser.on('packet', this._packetSequencer.handleIncomingPacket.bind(this._packetSequencer));

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
      this._connected = false;
    });

    this._conn.on('readable', () => {
      this._clientLogger.trace(`data available to be read from the 'conn' stream...`);
      let data = this._conn.read();

      while (data) {
        this._clientLogger.trace(`process the data..`);
        // process the data
        this._incomingPacketParser.parse(data);
        data = this._conn.read();
      }
    });

    this.on('clientError', this.onError);
    this._conn.on('error', this.emit.bind(this, 'clientError'));

    this._conn.on('close', () => {
      this.disconnect({ force: false });
    });
    this._eos = eosPromisified(this._conn);
    this._eos.catch((err: any) => {
      this.emit('error', err);
    });
  }

  /**
   * connect
   * @param options
   * @returns
   */
  public async connect(): Promise<IConnackPacket> {
    this._connecting = true;
    const packet: IConnectPacket = {
      cmd: 'connect',
      clientId: this._options.clientId,
      protocolVersion: this._options.protocolVersion,
      clean: this._options.clean,
      keepalive: this._options.keepalive,
      username: this._options.username,
      password: this._options.password,
      will: this._options.will,
      properties: this._options.properties,
    };
    logger.trace(`running connect sequence...`);
    /**
     * TODO: Do we have to do any cleanup here if there is an error while connecting?
     */
    const connack = await this._packetSequencer.runSequence(packet) as IConnackPacket
    [this._connecting, this._connected] = [false, true];
    logger.trace('client connected.');
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
    const messageId = this._numberAllocator.alloc();
    if (messageId === null) {
      logger.error("All messageId's are allocated.");
      this.emit(`error in numberAllocator during publish`); // TODO: this is probably not the event name we want to emit
      return;
    }
    const defaultPublishPacket: IPublishPacket = {
      cmd: 'publish',
      retain: false,
      dup: false,
      messageId,
      qos: 0,
      topic: 'default',
      payload: '',
    };
    const publishPacket: IPublishPacket = {
      ...defaultPublishPacket,
      ...packet,
    };

    try {
      // TODO: remove this ugly cast
      await this._packetSequencer.runSequence('publish', (publishPacket as unknown) as sequencer.Message);
    } finally {
      this._numberAllocator.free(messageId);
    }
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

  onError(err?: Error | null | undefined) {
    this._connecting = false;
    this._errored = true;
    this._conn.removeAllListeners('error');
    this._conn.on('error', () => {});
    // hack to clean up the write callbacks in case of error
    this.hackyCleanupWriteCallback();
    this._destroyClient(true);
    this.emit('error', err);
  }

  hackyCleanupWriteCallback() {
    // _writableState is not part of the public API for Duplex or Socket, so we have to do some typecasting here to work with it as the stream state.
    // See https://github.com/nodejs/node/issues/445 for information on this.
    const state = (this._conn as any)._writableState;
    if (typeof state.getBuffer !== 'function') {
      // See https://github.com/nodejs/node/pull/31165
      throw new Error('_writableState.buffer is EOL. _writableState should have getBuffer() as a function.');
    }
    const list: any[] = state.getBuffer();
    list.forEach((req) => {req.callback()});
  }
}
