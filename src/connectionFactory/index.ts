import net from 'net'
import { Duplex } from 'stream'
import tls from 'tls'
import { ConnectOptions, isBrowser } from '..'

const logger = require('pino')()

export function connectionFactory (options: ConnectOptions): Duplex {
  const brokerUrl: URL = options.brokerUrl as URL
  const tlsOptions = options.tlsOptions
  switch (brokerUrl.protocol) {
    case 'tcp': {
      const port: number = parseInt(brokerUrl.port) || 1883
      const host: string = brokerUrl.hostname || brokerUrl.host || 'localhost'
      
      // logger('port %d and host %s', port, host)
      return net.createConnection(port, host)
    }
    case 'tls': {
      const port: number = parseInt(brokerUrl.port) || 8883
      const host: string = brokerUrl.hostname || brokerUrl.host || 'localhost'
      const servername: string = brokerUrl.host

      logger(`port ${port} host ${host} servername ${servername}`)

      const connection: tls.TLSSocket = tls.connect({port: port, host: host, servername: servername, ...options.tlsOptions})
      /* eslint no-use-before-define: [2, "nofunc"] */
      connection.on('secureConnect', function () {
        if (tlsOptions.rejectUnauthorized && !connection.authorized) {
          connection.emit('error', new Error('TLS not authorized'))
        } else {
          connection.removeListener('error', handleTLSerrors)
        }
      })

      function handleTLSerrors (err) {
        // How can I get verify this error is a tls error?
        if (rejectUnauthorized) {
          client.emit('error', err)
        }

        // close this connection to match the behaviour of net
        // otherwise all we get is an error from the connection
        // and close event doesn't fire. This is a work around
        // to enable the reconnect code to work the same as with
        // net.createConnection
        connection.end()
      }

      connection.on('error', handleTLSerrors)
      return connection
    }
    case 'ws': {
      const webSocketOptions: WebSocketOptions = {
        url: client.transformWsUrl ? client.transformWsUrl(url, client) : url,
        hostname: url.hostname || 'localhost',
        port: url.port || url.protocol === 'wss' ? 443 : 80,
        protocol: url.protocol,
        path: url.pathname || '/',
        wsOptions: client.wsOptions || {}
      }

      // Add cert/key/ca etc options
      const wssOptions = ['rejectUnauthorized', 'ca', 'cert', 'key', 'pfx', 'passphrase']
      wssOptions.forEach(function (prop) {
        // TODO: Validate this works if the property is on the client
        if (!client.wsOptions.hasOwnProperty(prop) && client.hasOwnProperty(prop)) {
          webSocketOptions.wsOptions[prop] = client[prop]
        }
      })
      if (isBrowser) {
        _buildWebSocketStreamBrowser(webSocketOptions)
      } else {
        this._buildWebSocketStream(webSocketOptions)
      }
    }
  }
}

interface WebSocketOptions {
  url: URL,
  hostname: string,
  protocol: string,
  port: number,
  path: string,
  wsOptions: {
    rejectUnauthorized: any,
    ca: any,
    cert: any,
    key: any,
    pfx: any,
    passphrase: any
  }
}

function _buildWebSocketStreamBrowser (opts: WebSocketOptions) {
  if (!opts.hostname) {
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

function _buildWebSocketStream (opts: WebSocketOptions) {
  if (!isBrowser && opts.protocol === 'wss') {

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
