'use strict'

import { Packet } from "mqtt-packet"
import {Readable} from 'stream'

const streamsOpts = { objectMode: true }
const defaultStoreOptions = {
  clean: true
}

/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 * @param {Object} [options] - store options
 */
export class Store  {
  private _inflights: any
  options: any

  constructor(options: any = {}) {
    this.options = {...options, defaultStoreOptions}
    this._inflights = new Map()
  }

  /**
   * Adds a packet to the store, a packet is
   * anything that has a messageId property.
   *
   */
  async put (packet: Packet): Promise<Store> {
    this._inflights.set(packet.messageId, packet)
    return this
  }

  /**
   * Creates a stream with all the packets in the store
   *
   */
  async createStream () {
    const stream = new Readable(streamsOpts)
    let destroyed = false
    const values: any[] = []
    let i = 0

    this._inflights.forEach((value: any) => {
      values.push(value)
    })

    stream._read = function () {
      if (!destroyed && i < values.length) {
        this.push(values[i++])
      } else {
        this.push(null)
      }
    }

    stream.destroy = function (_error?: Error | undefined): Readable {
      if (!destroyed) {
        destroyed = true
        setTimeout(() => {
          this.emit('close')
        }, 0)
      }
      return stream
    }

    return stream
  }

  /**
   * deletes a packet from the store.
   */
  async del (packet: Packet): Promise<Packet> {
    packet = this._inflights.get(packet.messageId)
    if (packet) {
      this._inflights.delete(packet.messageId)
      return packet
    } else {
      throw new Error('missing packet')
    }
  }



  /**
   * get a packet from the store.
   */
  async get (packet: Packet): Promise<Packet> {
    packet = this._inflights.get(packet.messageId)
    if (packet) {
      return packet
    } else {
      throw new Error('missing packet')
    }
  }

  /**
   * Close the store
   */
  async close () {
    if (this.options.clean) {
      this._inflights = null
    }
    return
  }
}
