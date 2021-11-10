import { Duplex } from "stream";
import { WebSocketOptions } from "./webSocketOptions";


export function _buildWebSocketStream (opts: WebSocketOptions): Duplex {
  throw new Error('_buildWebSocketStreamBrowser is not implemented.')
  // if (!opts.url.hostname) {
  //   // Throwing an error in a Web Worker if no `hostname` is given, because we
  //   // can not determine the `hostname` automatically.  If connecting to
  //   // localhost, please supply the `hostname` as an argument.
  //   if (typeof (document) === 'undefined') {
  //     throw new Error('Could not determine host. Specify host manually.')
  //   }
  //   const parsed = new URL(document.URL)
  //   opts.url.hostname = parsed.hostname

  //   if (!opts.url.port) {
  //     opts.url.port = parsed.port
  //   }
  // }

  // // objectMode should be defined for logic
  // if (opts.wsOptions.objectMode === undefined) {
  //   opts.wsOptions.objectMode = !(opts.binary === true || opts.binary === undefined)
  // }
  // const websocketSubProtocol =
  // (opts.url.protocolId === 'MQIsdp') && (opts.protocolVersion === 3)
  //   ? 'mqttv3.1'
  //   : 'mqtt'

  // const url = buildUrl(opts, client)
  // /* global WebSocket */
  // const socket = new WebSocket(url, [websocketSubProtocol])
  // socket.binaryType = 'arraybuffer'
  // logger('browserStreamBuilder')
  // let stream: Duplex
  // // sets the maximum socket buffer size before throttling
  // const bufferSize = options.browserBufferSize || 1024 * 512

  // const bufferTimeout = opts.browserBufferTimeout || 1000

  // const coerceToBuffer = !opts.objectMode

  // const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser)

  // if (!opts.objectMode) {
  //   proxy._writev = writev
  // }
  // proxy.on('close', () => { socket.close() })

  // const eventListenerSupport = (typeof socket.addEventListener !== 'undefined')

  // // was already open when passed in
  // if (socket.readyState === socket.OPEN) {
  //   stream = proxy
  // } else {
  //   stream = stream = duplexify(undefined, undefined, opts)
  //   if (!opts.objectMode) {
  //     stream._writev = writev
  //   }

  //   if (eventListenerSupport) {
  //     socket.addEventListener('open', onopen)
  //   } else {
  //     socket.onopen = onopen
  //   }
  // }

  // stream.socket = socket

  // if (eventListenerSupport) {
  //   socket.addEventListener('close', onclose)
  //   socket.addEventListener('error', onerror)
  //   socket.addEventListener('message', onmessage)
  // } else {
  //   socket.onclose = onclose
  //   socket.onerror = onerror
  //   socket.onmessage = onmessage
  // }

  // // methods for browserStreamBuilder

  // function buildProxy (options: ConnectOptions, socketWrite: (chunk: any, enc: any, next: any) => any, socketEnd: (done: any) => void) {
  //   const proxy = new Transform({
  //     objectModeMode: options.objectMode
  //   })

  //   proxy._write = socketWrite
  //   proxy._flush = socketEnd

  //   return proxy
  // }

  // function onopen () {
  //   stream.setReadable(proxy)
  //   stream.setWritable(proxy)
  //   stream.emit('connect')
  // }

  // function onclose () {
  //   stream.end()
  //   stream.destroy()
  // }

  // function onerror (err: any) {
  //   stream.destroy(err)
  // }

  // function onmessage (event: { data: any }) {
  //   let data = event.data
  //   if (data instanceof ArrayBuffer) data = Buffer.from(data)
  //   else data = Buffer.from(data, 'utf8')
  //   proxy.push(data)
  // }

  // // this is to be enabled only if objectMode is false
  // function writev (chunks: string | any[], cb: any) {
  //   const buffers = new Array(chunks.length)
  //   for (let i = 0; i < chunks.length; i++) {
  //     if (typeof chunks[i].chunk === 'string') {
  //       buffers[i] = Buffer.from(chunks[i], 'utf8')
  //     } else {
  //       buffers[i] = chunks[i].chunk
  //     }
  //   }

  //   this._write(Buffer.concat(buffers), 'binary', cb)
  // }

  // function socketWriteBrowser (chunk: string | ArrayBuffer | { valueOf(): string } | { [Symbol.toPrimitive](hint: "string"): string } | Blob | ArrayBufferView, enc: any, next: (arg0: unknown) => void) {
  //   if (socket.bufferedAmount > bufferSize) {
  //     // throttle data until buffered amount is reduced.
  //     setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next)
  //   }

  //   if (coerceToBuffer && typeof chunk === 'string') {
  //     chunk = Buffer.from(chunk, 'utf8')
  //   }

  //   try {
  //     socket.send(chunk)
  //   } catch (err) {
  //     return next(err)
  //   }

  //   next()
  // }

  // function socketEndBrowser (done: () => void) {
  //   socket.close()
  //   done()
  // }

  // // end methods for browserStreamBuilder

  // return stream
}