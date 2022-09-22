'use strict';

/**
 * Module dependencies
 */
import { Readable } from 'readable-stream';
const streamsOpts = { objectMode: true };

export interface StoreOptions {
  clean: boolean;
}
const defaultStoreOptions: StoreOptions = {
  clean: true,
};

type Packet = any;

export default class Store {
  options: StoreOptions;
  private _inflights: Map<string, Packet>;

  /**
   * In-memory implementation of the message store
   * This can actually be saved into files.
   *
   * @param {Object} [options] - store options
   */
  constructor(options?: StoreOptions) {
    // Defaults
    if (options) {
      this.options = { ...defaultStoreOptions, ...options };
    } else {
      this.options = { ...(options as any) };
    }

    this._inflights = new Map<string, Packet>();
  }

  /**
   * Adds a packet to the store, a packet is
   * anything that has a messageId property.
   *
   */
  public put(packet: any, cb: (err?: Error) => void): this {
    this._inflights.set(packet.messageId, packet);

    if (cb) {
      cb();
    }

    return this;
  }

  /**
   * Creates a stream with all the packets in the store
   *
   */
  public createStream(): Readable {
    const stream = new Readable(streamsOpts);
    const values: Packet[] = [];
    let destroyed = false;
    let i = 0;

    this._inflights.forEach(function (value: Packet, _key: string) {
      values.push(value);
    });

    stream._read = function () {
      if (!destroyed && i < values.length) {
        this.push(values[i++]);
      } else {
        this.push(null);
      }
    };

    stream.destroy = function (_error?: Error): any {
      if (destroyed) {
        return;
      }

      const self = this;

      destroyed = true;

      setTimeout(function () {
        self.emit('close');
      }, 0);
    };

    return stream;
  }

  /**
   * deletes a packet from the store.
   */
  public del(packet: any, cb: Function): this {
    packet = this._inflights.get(packet.messageId);
    if (packet) {
      this._inflights.delete(packet.messageId);
      cb(null, packet);
    } else if (cb) {
      cb(new Error('missing packet'));
    }

    return this;
  }

  /**
   * get a packet from the store.
   */
  public get(packet: any, cb: (err?: Error, packet?: Packet) => void): this {
    packet = this._inflights.get(packet.messageId);
    if (packet) {
      cb(undefined, packet);
    } else if (cb) {
      cb(new Error('missing packet'));
    }

    return this;
  }

  /**
   * Close the store
   */
  // TODO: store needs to be an interface since we except others to write to it
  public close(cb: (err?: Error) => void): void {
    if (this.options.clean) {
      this._inflights = new Map<string, Packet>();
    }
    if (cb) {
      cb();
    }
  }
}

module.exports = Store;
