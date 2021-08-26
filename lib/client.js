'use strict'

import { mqtt } from 'mqtt-packet'
import { handle } from 'handlers'
import net from 'net'
import WebSocket, { createWebSocketStream } from 'ws'

// const eventEmitter = require('events')
// const mqttErrors = require('errors')

const logger = require('pino')()

export class Client {
  constructor (options) {
    this.closed = false
    this.connecting = false
    this.connected = false
    this.errored = false
    this.id = null
    this.clean = true
    this.version = null
    // eslint-disable-next-line camelcase
    // TODO: _isBrowser should be a global value and should be standardized....
    this._isBrowser = (typeof process !== 'undefined' && process.title === 'browser') || typeof __webpack_require__ === 'function'

    // Connect Information
    this.protocol = null
    this.port = null
    this.hostname = null
    this.rejectUnauthorized = null

    this.stream = this._streamBuilder()

    this._reconnectCount = 0

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

    this._options = options || { ...this._defaultConnectOptions }
    this._options.clientId = options.clientId || `mqttjs_ ${Math.random().toString(16).substr(2, 8)}`
    this._parser._queue = []
    this._parser.on('packet', this.enqueue)
    this.once('connected', this.dequeue)
    this.on('connect', this._sendQueuedPackets())
    this.on('close', this._closeClient())
  }

  _streamBuilder (opts) {
    switch (this.protocol) {
      case 'tcp': {
        return net.createConnection(port, host)
      }
      case 'tls': {
        // TODO: This needs to have options passed down to it.
        // We should probably have the whole options object just
        // passed down to tls.connect, right?

        function handleTLSErrors () {
          // How can I get verify this error is a tls error?
          if (opts.rejectUnauthorized) {
            mqttClient.emit('error', err)
          }

          // close this connection to match the behaviour of net
          // otherwise all we get is an error from the connection
          // and close event doesn't fire. This is a work around
          // to enable the reconnect code to work the same as with
          // net.createConnection
          connection.end()
        }
        connection = tls.connect(opts)
        connection.on('secureConnect', function () {
          if (opts.rejectUnauthorized && !connection.authorized) {
            connection.emit('error', new Error('TLS not authorized'))
          } else {
            connection.removeListener('error', handleTLSErrors)
          }
        })

        connection.on('error', handleTLSErrors)
        return connection
      }
      case 'ws': {
        if (this._isBrowser) {
          this._buildWebSocketStreamBrowser(opts)
        } else {
          this._buildWebSocketStream(opts)
        }
      }
    }
  }

  // To consider : do we want to have this in the main code,
  // or do we want to have a browser shim?
  _buildWebSocketStreamBrowser (opts) {
    const options = opts
    if (!opts.hostname) {
      options.hostname = 'localhost'
    }
    if (!opts.port) {
      if (opts.protocol === 'wss') {
        options.port = 443
      } else {
        options.port = 80
      }
    }
    if (!opts.path) {
      options.path = '/'
    }

    if (!opts.wsOptions) {
      options.wsOptions = {}
    }
    if (!IS_BROWSER && opts.protocol === 'wss') {
      // Add cert/key/ca etc options
      WSS_OPTIONS.forEach(function (prop) {
        if (opts.hasOwnProperty(prop) && !opts.wsOptions.hasOwnProperty(prop)) {
          options.wsOptions[prop] = opts[prop]
        }
      })
    }

    if (!options.hostname) {
      options.hostname = options.host
    }

    if (!options.hostname) {
      // Throwing an error in a Web Worker if no `hostname` is given, because we
      // can not determine the `hostname` automatically.  If connecting to
      // localhost, please supply the `hostname` as an argument.
      if (typeof (document) === 'undefined') {
        throw new Error('Could not determine host. Specify host manually.')
      }
      const parsed = new URL(document.URL)
      options.hostname = parsed.hostname

      if (!options.port) {
        options.port = parsed.port
      }
    }

    // objectMode should be defined for logic
    if (options.objectMode === undefined) {
      options.objectMode = !(options.binary === true || options.binary === undefined)
    }
    const websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

    const url = buildUrl(opts, client)
    /* global WebSocket */
    const socket = new WebSocket(url, [websocketSubProtocol])
    socket.binaryType = 'arraybuffer'
    logger('browserStreamBuilder')
    let stream
    // sets the maximum socket buffer size before throttling
    const bufferSize = options.browserBufferSize || 1024 * 512

    const bufferTimeout = opts.browserBufferTimeout || 1000

    const coerceToBuffer = !opts.objectMode

    const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser)

    if (!opts.objectMode) {
      proxy._writev = writev
    }
    proxy.on('close', () => { socket.close() })

    const eventListenerSupport = (typeof socket.addEventListener !== 'undefined')

    // was already open when passed in
    if (socket.readyState === socket.OPEN) {
      stream = proxy
    } else {
      stream = stream = duplexify(undefined, undefined, opts)
      if (!opts.objectMode) {
        stream._writev = writev
      }

      if (eventListenerSupport) {
        socket.addEventListener('open', onopen)
      } else {
        socket.onopen = onopen
      }
    }

    stream.socket = socket

    if (eventListenerSupport) {
      socket.addEventListener('close', onclose)
      socket.addEventListener('error', onerror)
      socket.addEventListener('message', onmessage)
    } else {
      socket.onclose = onclose
      socket.onerror = onerror
      socket.onmessage = onmessage
    }

    // methods for browserStreamBuilder

    function buildProxy (options, socketWrite, socketEnd) {
      const proxy = new Transform({
        objectModeMode: options.objectMode
      })

      proxy._write = socketWrite
      proxy._flush = socketEnd

      return proxy
    }

    function onopen () {
      stream.setReadable(proxy)
      stream.setWritable(proxy)
      stream.emit('connect')
    }

    function onclose () {
      stream.end()
      stream.destroy()
    }

    function onerror (err) {
      stream.destroy(err)
    }

    function onmessage (event) {
      let data = event.data
      if (data instanceof ArrayBuffer) data = Buffer.from(data)
      else data = Buffer.from(data, 'utf8')
      proxy.push(data)
    }

    // this is to be enabled only if objectMode is false
    function writev (chunks, cb) {
      const buffers = new Array(chunks.length)
      for (let i = 0; i < chunks.length; i++) {
        if (typeof chunks[i].chunk === 'string') {
          buffers[i] = Buffer.from(chunks[i], 'utf8')
        } else {
          buffers[i] = chunks[i].chunk
        }
      }

      this._write(Buffer.concat(buffers), 'binary', cb)
    }

    function socketWriteBrowser (chunk, enc, next) {
      if (socket.bufferedAmount > bufferSize) {
        // throttle data until buffered amount is reduced.
        setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next)
      }

      if (coerceToBuffer && typeof chunk === 'string') {
        chunk = Buffer.from(chunk, 'utf8')
      }

      try {
        socket.send(chunk)
      } catch (err) {
        return next(err)
      }

      next()
    }

    function socketEndBrowser (done) {
      socket.close()
      done()
    }

    // end methods for browserStreamBuilder

    return stream
  }

  _buildWebSocketStream (opts) {
    const options = opts
    if (!opts.hostname) {
      options.hostname = 'localhost'
    }
    if (!opts.port) {
      if (opts.protocol === 'wss') {
        options.port = 443
      } else {
        options.port = 80
      }
    }
    if (!opts.path) {
      options.path = '/'
    }

    if (!opts.wsOptions) {
      options.wsOptions = {}
    }
    if (!IS_BROWSER && opts.protocol === 'wss') {
      // Add cert/key/ca etc options
      WSS_OPTIONS.forEach(function (prop) {
        if (opts.hasOwnProperty(prop) && !opts.wsOptions.hasOwnProperty(prop)) {
          options.wsOptions[prop] = opts[prop]
        }
      })
    }
    const url = buildUrl(options, client)
    const websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

    const socket = new WebSocket(url, [websocketSubProtocol], opts.wsOptions)
    const webSocketStream = createWebSocketStream(socket, options.wsOptions)
    webSocketStream.url = url
    socket.on('close', () => { webSocketStream.destroy() })
    return webSocketStream
  }

  async enqueue (packet) {
    this._parsingBatch++
    // already connected or it's the first packet
    if (this.connackSent || this._parsingBatch === 1) {
      await handle(this, packet, this._nextBatch)
    } else {
      if (this._parser._queue.length < this._queueLimit) {
        this._parser._queue.push(packet)
      } else {
        this.emit('error', new Error('Client queue limit reached'))
      }
    }
  }

  async dequeue () {
    const q = this._parser._queue
    if (q) {
      for (let i = 0, len = q.length; i < len; i++) {
        await handle(this, q[i], this._nextBatch)
      }

      this._parser._queue = null
    }
  }

  _closeClient () {
    logger('close :: connected set to `false`')
    this.connected = false

    logger('close :: clearing connackTimer')
    clearTimeout(this.connackTimer)

    logger('close :: clearing ping timer')
    if (that.pingTimer !== null) {
      that.pingTimer.clear()
      that.pingTimer = null
    }

    logger('close :: calling _setupReconnect')
    this._setupReconnect()
  }

  _sendQueuedPackets () {
    const queue = this.queue

    function deliver () {
      const entry = queue.shift()
      logger('deliver :: entry %o', entry)
      let packet = null

      if (!entry) {
        return
      }

      packet = entry.packet
      logger('deliver :: call _sendPacket for %o', packet)
      let send = true
      if (packet.messageId && packet.messageId !== 0) {
        if (!that.messageIdProvider.register(packet.messageId)) {
          packet.messageeId = that.messageIdProvider.allocate()
          if (packet.messageId === null) {
            send = false
          }
        }
      }
      if (send) {
        that._sendPacket(
          packet,
          function (err) {
            if (entry.cb) {
              entry.cb(err)
            }
            deliver()
          }
        )
      } else {
        logger('messageId: %d has already used.', packet.messageId)
        deliver()
      }
    }

    deliver()
  }

  async publish (topic, message, opts) {
    const result = await handle.publish(this, message)
    return result
  }

  async subscribe (packet) {
    if (!packet.subscriptions) {
      packet = { subscriptions: Array.isArray(packet) ? packet : [packet] }
    }
    const result = await handle.subscribe(this, packet)
    return result
  }

  async unsubscribe (packet) {
    const result = await handle.unsubscribe(this, packet)
    return result
  }

  async end (force, opts) {
    const that = this

    logger('end :: (%s)', this.options.clientId)

    if (force == null || typeof force !== 'boolean') {
      cb = opts || nop
      opts = force
      force = false
      if (typeof opts !== 'object') {
        cb = opts
        opts = null
        if (typeof cb !== 'function') {
          cb = nop
        }
      }
    }

    if (typeof opts !== 'object') {
      cb = opts
      opts = null
    }

    logger('end :: cb? %s', !!cb)
    cb = cb || nop

    function closeStores () {
      logger('end :: closeStores: closing incoming and outgoing stores')
      that.disconnected = true
      that.incomingStore.close(function (e1) {
        that.outgoingStore.close(function (e2) {
          logger('end :: closeStores: emitting end')
          that.emit('end')
          if (cb) {
            const err = e1 || e2
            logger('end :: closeStores: invoking callback with args')
            cb(err)
          }
        })
      })
      if (that._deferredReconnect) {
        that._deferredReconnect()
      }
    }

    function finish () {
      // defer closesStores of an I/O cycle,
      // just to make sure things are
      // ok for websockets
      logger('end :: (%s) :: finish :: calling _cleanUp with force %s', that.options.clientId, force)
      that._cleanUp(force, () => {
        logger('end :: finish :: calling process.nextTick on closeStores')
        // var boundProcess = nextTick.bind(null, closeStores)
        nextTick(closeStores.bind(that))
      }, opts)
    }

    if (this.disconnecting) {
      cb()
      return this
    }

    this._clearReconnect()

    this.disconnecting = true

    if (!force && Object.keys(this.outgoing).length > 0) {
      // wait 10ms, just to be sure we received all of it
      logger('end :: (%s) :: calling finish in 10ms once outgoing is empty', that.options.clientId)
      this.once('outgoingEmpty', setTimeout.bind(null, finish, 10))
    } else {
      logger('end :: (%s) :: immediately calling finish', that.options.clientId)
      finish()
    }

    return this
  }

  /**
   * removeOutgoingMessage - remove a message in outgoing store
   * the outgoing callback will be called withe Error('Message removed') if the message is removed
   *
   * @param {Number} messageId - messageId to remove message
   * @returns {MqttClient} this - for chaining
   * @api public
   *
   * @example client.removeOutgoingMessage(client.getLastAllocated());
   */
  removeOutgoingMessage (messageId) {
    const cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
    delete this.outgoing[messageId]
    this.outgoingStore.del({ messageId: messageId }, function () {
      cb(new Error('Message removed'))
    })
    return this
  }

  reconnect (opts) {
    logger('client reconnect')
    const that = this
    const f = function () {
      if (opts) {
        that.options.incomingStore = opts.incomingStore
        that.options.outgoingStore = opts.outgoingStore
      } else {
        that.options.incomingStore = null
        that.options.outgoingStore = null
      }
      that.incomingStore = that.options.incomingStore || new Store()
      that.outgoingStore = that.options.outgoingStore || new Store()
      that.disconnecting = false
      that.disconnected = false
      that._deferredReconnect = null
      that._reconnect()
    }

    if (this.disconnecting && !this.disconnected) {
      this._deferredReconnect = f
    } else {
      f()
    }
    return this
  }

  _reconnect () {
    logger('_reconnect: emitting reconnect to client')
    this.emit('reconnect')
    if (this.connected) {
      this.end(() => { this._setupStream() })
      logger('client already connected. disconnecting first.')
    } else {
      logger('_reconnect: calling _setupStream')
      this._setupStream()
    }
  }

  _setupReconnect () {
    if (!this.disconnecting && !this.reconnectTimer && (this.options.reconnectPeriod > 0)) {
      if (!this.reconnecting) {
        logger('_setupReconnect :: emit `offline` state')
        this.emit('offline')
        logger('_setupReconnect :: set `reconnecting` to `true`')
        this.reconnecting = true
      }
      logger('_setupReconnect :: setting reconnectTimer for %d ms', this.options.reconnectPeriod)
      this.reconnectTimer = setInterval(() => {
        logger('reconnectTimer :: reconnect triggered!')
        this._reconnect()
      }, this.options.reconnectPeriod)
    } else {
      logger('_setupReconnect :: doing nothing...')
    }
  }

  _clearReconnect () {
    logger('_clearReconnect : clearing reconnect timer')
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  async _cleanUp (forced) {
    const opts = arguments[2]
    if (done) {
      logger('_cleanUp :: done callback provided for on stream close')
      this.stream.on('close', done)
    }

    logger('_cleanUp :: forced? %s', forced)
    if (forced) {
      if ((this.options.reconnectPeriod === 0) && this.options.clean) {
        flush(this.outgoing)
      }
      logger('_cleanUp :: (%s) :: destroying stream', this.options.clientId)
      this.stream.destroy()
    } else {
      const packet = xtend({ cmd: 'disconnect' }, opts)
      logger('_cleanUp :: (%s) :: call _sendPacket with disconnect packet', this.options.clientId)
      this._sendPacket(
        packet,
        setImmediate.bind(
          null,
          this.stream.end.bind(this.stream)
        )
      )
    }

    if (!this.disconnecting) {
      logger('_cleanUp :: client not disconnecting. Clearing and resetting reconnect.')
      this._clearReconnect()
      this._setupReconnect()
    }

    if (this.pingTimer !== null) {
      logger('_cleanUp :: clearing pingTimer')
      this.pingTimer.clear()
      this.pingTimer = null
    }

    if (done && !this.connected) {
      logger('_cleanUp :: (%s) :: removing stream `done` callback `close` listener', this.options.clientId)
      this.stream.removeListener('close', done)
      done()
    }
  }

  async _sendPacket (packet) {
    logger('_sendPacket :: (%s) ::  start', this.options.clientId)
    cbStorePut = cbStorePut || nop

    if (!this.connected) {
      logger('_sendPacket :: client not connected. Storing packet offline.')
      this._storePacket(packet, cb, cbStorePut)
      return
    }

    // When sending a packet, reschedule the ping timer
    this._shiftPingInterval()

    switch (packet.cmd) {
      case 'publish':
        break
      case 'pubrel':
        storeAndSend(this, packet, cb, cbStorePut)
        return
      default:
        sendPacket(this, packet, cb)
        return
    }

    switch (packet.qos) {
      case 2:
      case 1:
        storeAndSend(this, packet, cb, cbStorePut)
        break
      /**
       * no need of case here since it will be caught by default
       * and jshint comply that before default it must be a break
       * anyway it will result in -1 evaluation
       */
      case 0:
        /* falls through */
      default:
        sendPacket(this, packet, cb)
        break
    }
  }

  _storePacket (packet) {
    cbStorePut = cbStorePut || nop

    // check that the packet is not a qos of 0, or that the command is not a publish
    if (((packet.qos || 0) === 0 && this.queueQoSZero) || packet.cmd !== 'publish') {
      this.queue.push({ packet: packet, cb: cb })
    } else if (packet.qos > 0) {
      cb = this.outgoing[packet.messageId] ? this.outgoing[packet.messageId].cb : null
      this.outgoingStore.put(packet, function (err) {
        if (err) {
          return cb && cb(err)
        }
        cbStorePut()
      })
    } else if (cb) {
      cb(new Error('No connection to broker'))
    }
  }
}
