'use strict'

const mqtt = require('mqtt-packet')
// const eventEmitter = require('events')
const handle = require('handlers')
// const mqttErrors = require('errors')

// const logger = require('pino')()

export class Client {
  constructor (options) {
    this.closed = false
    this.connecting = false
    this.connected = false
    this.errored = false
    this.id = null
    this.clean = true
    this.version = null

    this._disconnected = false
    this._authorized = false
    this._parser = mqtt.parser()
    this._defaultConnectOptions = {
      keepalive: 60,
      reschedulePings: true,
      protocolId: 'MQTT',
      protocolVersion: 4,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      clean: true,
      resubscribe: true
    }

    this._options = options || {...this._defaultConnectOptions}
    this._options.clientId = options.clientId || `mqttjs_ ${Math.random().toString(16).substr(2, 8)}`
    this._parser.client = this
    this._parser._queue = []
    this._parser.on('packet', this.enqueue)
    this.once('connected', this.dequeue)
    // TBD
  }

  enqueue () {
    return true
  }

  dequeue () {
    return true
  }

  static async connect (options) {
    return new Client(options)
  }

  async publish (topic, message, opts) {
    const result = await handle.publish(this, message)
    return result
  }

  async subscribe (packet) {
    if (!packet.subscriptions) {
      packet = {subscriptions: Array.isArray(packet) ? packet : [packet]}
    }
    const result = await handle.subscribe(this, packet)
    return result
  }

  async unsubscribe (packet) {
    const result = await handle.unsubscribe(this, packet)
    return result
  }
}
