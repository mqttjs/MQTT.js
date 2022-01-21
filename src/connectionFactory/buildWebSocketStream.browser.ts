import { Transform } from "stream";
import { WebSocketOptions } from "./interfaces/webSocketOptions.js";
import duplexify from 'duplexify';
import { WebSocketStream } from "./interfaces/webSocketStream.js";

const logger = require('pino')()

export function buildWebSocketStream (opts: WebSocketOptions): WebSocketStream {
  // objectMode should be defined for logic
  if (opts.wsOptions.ObjectMode === undefined) {
    opts.wsOptions.objectMode = !(opts.binary === true || opts.binary === undefined)
  }

  /* global WebSocket */
  const socket = new WebSocket(opts.url, [opts.websocketSubProtocol])
  socket.binaryType = 'arraybuffer'
  logger('browserStreamBuilder')
  let stream: WebSocketStream
  // sets the maximum socket buffer size before throttling
  const bufferSize = opts.browserBufferSize || 1024 * 512

  const bufferTimeout = opts.browserBufferTimeout || 1000

  const coerceToBuffer = !opts.objectMode

  const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser)

  if (!opts.objectMode) {
    proxy._writev = (chunks, cb) => {
      const buffers = new Array(chunks.length)
      for (let i = 0; i < chunks.length; i++) {
        if (chunks && Array.isArray(chunks) && typeof (chunks as Array<any>)[i].chunk === 'string') {
          buffers[i] = Buffer.from((chunks as Array<any>)[i].chunk, 'utf8')
        } else {
          buffers[i] = (chunks as Array<any>)[i].chunk
        }
      }
      proxy._write(Buffer.concat(buffers), 'binary', cb)
    }
  }
  proxy.on('close', () => { socket.close() })

  const eventListenerSupport = (typeof socket.addEventListener !== 'undefined')

  // was already open when passed in
  if (socket.readyState === socket.OPEN) {
    stream = proxy
  } else {
    stream = stream = duplexify(undefined, undefined, opts)
    if (!opts.objectMode) {
      stream._writev = (chunks: string | any[], cb: any) => {
        const buffers = new Array(chunks.length)
        for (let i = 0; i < chunks.length; i++) {
          if (typeof chunks[i].chunk === 'string') {
            buffers[i] = Buffer.from(chunks[i], 'utf8')
          } else {
            buffers[i] = chunks[i].chunk
          }
        }
    
        stream._write(Buffer.concat(buffers), 'binary', cb)
      }
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

  interface BuildProxyOptions extends WebSocketOptions {

  }
  // methods for browserStreamBuilder

  function buildProxy (options: BuildProxyOptions, socketWrite: (chunk: any, enc: any, next: any) => any, socketEnd: (done: any) => void) {
    const proxy = new Transform({
      objectMode: options.objectMode
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

  function onerror (err: any) {
    stream.destroy(err)
  }

  function onmessage (event: { data: any }) {
    let data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    else data = Buffer.from(data, 'utf8')
    proxy.push(data)
  }

  // this is to be enabled only if objectMode is false

  function socketWriteBrowser (chunk: string | ArrayBufferLike | Blob | ArrayBufferView, enc: any, next: (err?: unknown) => unknown) {
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

  function socketEndBrowser (done: () => void) {
    socket.close()
    done()
  }

  // end methods for browserStreamBuilder

  return stream
}
