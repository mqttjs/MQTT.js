'use strict'

const WebSocket = require('ws')
const debug = require('debug')('mqttjs:ws')
const urlModule = require('url')
const { Duplex, Transform } = require('stream')
let WSS_OPTIONS = [
  'rejectUnauthorized',
  'ca',
  'cert',
  'key',
  'pfx',
  'passphrase'
]
let bufferTimeout = 1000
// eslint-disable-next-line camelcase
let IS_BROWSER = (typeof process !== 'undefined' && process.title === 'browser') || typeof __webpack_require__ === 'function'
function buildUrl (opts, client) {
  let url = opts.protocol + '://' + opts.hostname + ':' + opts.port + opts.path
  if (typeof (opts.transformWsUrl) === 'function') {
    url = opts.transformWsUrl(url, opts, client)
  }
  return url
}

function setDefaultOpts (opts) {
  if (!opts.hostname) {
    opts.hostname = 'localhost'
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      opts.port = 443
    } else {
      opts.port = 80
    }
  }
  if (!opts.path) {
    opts.path = '/'
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {}
  }
  if (!IS_BROWSER && opts.protocol === 'wss') {
    // Add cert/key/ca etc options
    WSS_OPTIONS.forEach(function (prop) {
      if (opts.hasOwnProperty(prop) && !opts.wsOptions.hasOwnProperty(prop)) {
        opts.wsOptions[prop] = opts[prop]
      }
    })
  }
}



function createWebSocket (client, opts) {
  debug('createWebSocket')
  debug('protocol: ' + opts.protocolId + ' ' + opts.protocolVersion)
  let websocketSubProtocol =
    (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
      ? 'mqttv3.1'
      : 'mqtt'

  setDefaultOpts(opts)
  let url = buildUrl(opts, client)
  debug('creating new Websocket for url: ' + url + ' and protocol: ' + websocketSubProtocol)
  let socket = new WebSocket(url, [websocketSubProtocol], opts.wsOptions)
  socket.url = url
  return socket
}

function createBrowserWebSocket(client, opts) {
  let ws = null
  let websocketSubProtocol =
  (opts.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
    ? 'mqttv3.1'
    : 'mqtt'

  setDefaultOpts(opts)
  let url = buildUrl(opts, client)

  if (typeof WebSocket !== 'undefined') {
    ws = WebSocket
  } else if (typeof MozWebSocket !== 'undefined') {
    ws = MozWebSocket
  } else if (typeof global !== 'undefined') {
    ws = global.WebSocket || global.MozWebSocket
  } else if (typeof window !== 'undefined') {
    ws = window.WebSocket || window.MozWebSocket
  } else if (typeof self !== 'undefined') {
    ws = self.WebSocket || self.MozWebSocket
  }
  let socket = new ws(url, [websocketSubProtocol])
  socket.url = url
  return socket
}

function streamBuilder (client, opts) {
  let socket = createWebSocket(client, opts)
  let webSocketStream = WebSocket.createWebSocketStream(socket, opts.wsOptions)
  return webSocketStream
}

function buildProxy (options, socketWrite, socketEnd) {
  let proxy = new Transform({
    objectModeMode : options.objectMode
  })

  proxy._write = socketWrite
  proxy._flush = socketEnd

  return proxy
}

function browserStreamBuilder (client, opts) {
  debug('browserStreamBuilder')

  if (!opts.hostname) {
    opts.hostname = opts.host
  }

  if (!opts.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof (document) === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.')
    }
    let parsed = urlModule.parse(document.URL)
    opts.hostname = parsed.hostname

    if (!opts.port) {
      opts.port = parsed.port
    }
  }

  // objectMode should be defined for logic
  if (options.objectMode === undefined) {
    options.objectMode = !(options.binary === true || options.binary === undefined)
  }

  let coerceToBuffer = !opts.objectMode

  socket = createBrowserWebSocket(client, opts)

  let stream = duplexify(undefined, undefined, options)
  if (!options.objectMode) {
    stream._writev = writev
  }

  let onopen = function() {
    stream.setReadable(proxy)
    stream.setWritable(proxy)
    stream.emit('connect')
  }
  let onclose = function() {
    stream.end()
    stream.destroy()
  }

  let onerror = function(err) {
    stream.destroy(err)
  }

  let onmessage = function (event) {
    let data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    else data = Buffer.from(data, 'utf8')
    proxy.push(data)
  }

  // this is to be enabled only if objectMode is false
  function writev (chunks, cb) {
    var buffers = new Array(chunks.length)
    for (var i = 0; i < chunks.length; i++) {
      if (typeof chunks[i].chunk === 'string') {
        buffers[i] = Buffer.from(chunks[i], 'utf8')
      } else {
        buffers[i] = chunks[i].chunk
      }
    }

    this._write(Buffer.concat(buffers), 'binary', cb)
  }

  const eventListenerSupport = ('undefined' === typeof socket.addEventListener)

  if (eventListenerSupport) {
    socket.addEventListener('open', onopen)
    socket.addEventListener('close', onclose)
    socket.addEventListener('error', onerror)
    socket.addEventListener('message', onmessage)
  } else {
    socket.onopen = onopen
    socket.onclose = onclose
    socket.onerror = onerror
    socket.onmessage = onmessage
  }

  function socketWriteBrowser(chunk, enc, next) {

    if (socket.bufferedAmount > bufferSize) {
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

  function socketEndBrowser(done) {
    socket.close()
    done()
  }

  let proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser)

  if (!opts.objectMode) {
    proxy._writev = writev
  }
  proxy.on('close', destroy)

  return stream
}

if (IS_BROWSER) {
  module.exports = browserStreamBuilder
} else {
  module.exports = streamBuilder
}
