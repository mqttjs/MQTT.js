'use strict'

/**
 * Module dependencies
 */
const Readable = require('readable-stream').Readable
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
class Store {

  constructor(options) {
    this.options = options || {}

    // Defaults
    this.options = { ...defaultStoreOptions, ...options }

    this._inflights = new Map()
  }
  /**
   * Adds a packet to the store, a packet is
   * anything that has a messageId property.
   *
   */
  put(packet, cb) {
    this._inflights.set(packet.messageId, packet)

    if (cb) {
      cb()
    }

    return this
  }
  /**
   * Creates a stream with all the packets in the store
   *
   */
  createStream() {
    const stream = new Readable(streamsOpts)
    const values = []
    let destroyed = false
    let i = 0

    this._inflights.forEach(function (value, key) {
      values.push(value)
    })

    stream._read = function () {
      if (!destroyed && i < values.length) {
        this.push(values[i++])
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

      setTimeout(function () {
        self.emit('close')
      }, 0)
    }

    return stream
  }
  /**
   * deletes a packet from the store.
   */
  del(packet, cb) {
    packet = this._inflights.get(packet.messageId)
    if (packet) {
      this._inflights.delete(packet.messageId)
      cb(null, packet)
    } else if (cb) {
      cb(new Error('missing packet'))
    }

    return this
  }
  /**
   * get a packet from the store.
   */
  get(packet, cb) {
    packet = this._inflights.get(packet.messageId)
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
  close(cb) {
    if (this.options.clean) {
      this._inflights = null
    }
    if (cb) {
      cb()
    }
  }
}

module.exports = Store
