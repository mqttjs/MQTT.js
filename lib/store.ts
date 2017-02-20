'use strict'

import {Readable} from 'readable-stream'
const streamsOpts = { objectMode: true }

/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 */
class Store {
  private _inflights: any

  constructor () {
    if (!(this instanceof Store)) {
      return new Store()
    }

    this._inflights = {}
  }

  /**
   * Adds a packet to the store, a packet is
   * anything that has a messageId property.
   *
   */
  put (packet, cb?) {
    this._inflights[packet.messageId] = packet

    if (cb) {
      cb()
    }

    return this
  }

  /**
   * Creates a stream with all the packets in the store
   *
   */
  createStream () {
    const stream = new Readable(streamsOpts)
    const inflights = this._inflights
    const ids = Object.keys(this._inflights)
    let destroyed = false
    let i = 0

    stream._read = function () {
      if (!destroyed && i < ids.length) {
        this.push(inflights[ids[i++]])
      } else {
        this.push(null)
      }
    }

    stream.destroy = function () {
      if (destroyed) {
        return
      }

      const self = this

      destroyed = true

      process.nextTick(function () {
        self.emit('close')
      })
    }

    return stream
  }

  /**
   * deletes a packet from the store.
   */
  del (packet, cb) {
    packet = this._inflights[packet.messageId]
    if (packet) {
      delete this._inflights[packet.messageId]
      cb(null, packet)
    } else if (cb) {
      cb(new Error('missing packet'))
    }

    return this
  }

  /**
   * get a packet from the store.
   */
  get (packet, cb) {
    packet = this._inflights[packet.messageId]
    if (packet) {
      cb(null, packet)
    } else if (cb) {
      cb(new Error('missing packet'))
    }

    return this
  }

  /**
   * Close the store
   */
  close (cb) {
    this._inflights = null
    if (cb) {
      cb()
    }
  }
}

export default Store
