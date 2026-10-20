import { Buffer } from 'buffer'
import Ws, { type ClientOptions } from 'ws'
import _debug from 'debug'
import { Duplex, Transform } from 'readable-stream'
import { type IStream, type StreamBuilder } from '../shared'
import isBrowser from '../is-browser'
import { type IClientOptions } from '../client'
import type MqttClient from '../client'
import { BufferedDuplex, writev } from '../BufferedDuplex'

const debug = _debug('mqttjs:ws')

const WSS_OPTIONS = [
	'rejectUnauthorized',
	'ca',
	'cert',
	'key',
	'pfx',
	'passphrase',
]

function buildUrl(opts: IClientOptions, client: MqttClient) {
	const url = `${opts.protocol}://${opts.hostname}:${opts.port}${opts.path}`
	if (typeof opts.transformWsUrl === 'function') {
		const result = opts.transformWsUrl(url, opts, client)
		return result
	}
	return url
}

function setDefaultOpts(opts: IClientOptions) {
	const options = opts

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
	if (!isBrowser && !opts.forceNativeWebSocket && opts.protocol === 'wss') {
		// Add cert/key/ca etc options
		WSS_OPTIONS.forEach((prop) => {
			if (
				Object.prototype.hasOwnProperty.call(opts, prop) &&
				!Object.prototype.hasOwnProperty.call(opts.wsOptions, prop)
			) {
				options.wsOptions[prop] = opts[prop]
			}
		})
	}

	return options
}

function setDefaultBrowserOpts(opts: IClientOptions) {
	const options = setDefaultOpts(opts)

	if (!options.hostname) {
		options.hostname = options.host
	}

	if (!options.hostname) {
		// Throwing an error in a Web Worker if no `hostname` is given, because we
		// can not determine the `hostname` automatically.  If connecting to
		// localhost, please supply the `hostname` as an argument.
		if (typeof document === 'undefined') {
			throw new Error('Could not determine host. Specify host manually.')
		}
		const parsed = new URL(document.URL)
		options.hostname = parsed.hostname

		if (!options.port) {
			options.port = Number(parsed.port)
		}
	}

	// objectMode should be defined for logic
	if (options.objectMode === undefined) {
		options.objectMode = !(
			options.binary === true || options.binary === undefined
		)
	}

	return options
}

function createWebSocket(
	client: MqttClient,
	url: string,
	opts: IClientOptions,
) {
	debug('createWebSocket')
	debug(`protocol: ${opts.protocolId} ${opts.protocolVersion}`)
	const websocketSubProtocol =
		opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3
			? 'mqttv3.1'
			: 'mqtt'

	debug(
		`creating new Websocket for url: ${url} and protocol: ${websocketSubProtocol}`,
	)
	let socket: Ws
	if (opts.createWebsocket) {
		socket = opts.createWebsocket(url, [websocketSubProtocol], opts)
	} else {
		socket = new Ws(
			url,
			[websocketSubProtocol],
			opts.wsOptions as ClientOptions,
		)
	}
	return socket
}

/* istanbul ignore next */
function createBrowserWebSocket(client: MqttClient, opts: IClientOptions) {
	const websocketSubProtocol =
		opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3
			? 'mqttv3.1'
			: 'mqtt'

	const urlOrPromise = buildUrl(opts, client)
	if (urlOrPromise instanceof Promise) {
		return urlOrPromise.then((url) => {
			let socket: WebSocket
			if (opts.createWebsocket) {
				socket = opts.createWebsocket(url, [websocketSubProtocol], opts)
			} else {
				socket = new WebSocket(url, [websocketSubProtocol])
			}
			socket.binaryType = 'arraybuffer'
			return socket
		})
	}
	const url = urlOrPromise
	let socket: WebSocket
	if (opts.createWebsocket) {
		socket = opts.createWebsocket(url, [websocketSubProtocol], opts)
	} else {
		socket = new WebSocket(url, [websocketSubProtocol])
	}
	socket.binaryType = 'arraybuffer'
	return socket
}

const streamBuilder: StreamBuilder = (client, opts): IStream => {
	debug('streamBuilder')
	const options = setDefaultOpts(opts)

	options.hostname = options.hostname || options.host || 'localhost'

	const urlOrPromise = buildUrl(options, client)

	if (typeof urlOrPromise === 'string') {
		const url = urlOrPromise
		const socket = createWebSocket(client, url, options)
		const webSocketStream = Ws.createWebSocketStream(
			socket,

			options.wsOptions as any,
		)

		webSocketStream['url'] = url
		socket.on('close', () => {
			webSocketStream.destroy()
		})
		return webSocketStream
	}

	// async case: buffer data until the URL promise resolves then create the WebSocket
	const writeQueue: Array<{
		chunk: any
		encoding: string
		cb: (err?: Error) => void
	}> = []
	let wsStream: ReturnType<typeof Ws.createWebSocketStream> | null = null
	let deferredDestroyed = false

	const deferredStream = new Duplex({
		read() {
			// push model - data is pushed from wsStream events once
			// the WebSocket connection is established
		},
		write(chunk, encoding, cb) {
			if (wsStream) {
				wsStream.write(chunk, encoding, cb)
			} else {
				writeQueue.push({ chunk, encoding, cb })
			}
		},
		destroy(err, cb) {
			deferredDestroyed = true
			if (wsStream) wsStream.destroy(err)
			cb(err)
		},
	})

	urlOrPromise
		.then((url) => {
			if (deferredDestroyed) return
			const socket = createWebSocket(client, url, options)

			wsStream = Ws.createWebSocketStream(
				socket,
				options.wsOptions as any,
			)
			deferredStream['url'] = url

			wsStream.on('data', (chunk) => {
				deferredStream.push(chunk)
			})
			wsStream.on('end', () => {
				deferredStream.push(null)
			})
			wsStream.on('error', (err) => {
				deferredStream.destroy(err)
			})
			socket.on('close', () => {
				wsStream!.destroy()
			})

			// flush buffered writes
			const queue = writeQueue.splice(0)
			for (const { chunk, encoding, cb } of queue) {
				wsStream.write(chunk, encoding as BufferEncoding, cb)
			}
		})
		.catch((err) => {
			deferredStream.destroy(err)
		})

	return deferredStream
}

/* istanbul ignore next */
const browserStreamBuilder: StreamBuilder = (client, opts) => {
	debug('browserStreamBuilder')
	let stream: BufferedDuplex | (Transform & { socket?: WebSocket })
	const options = setDefaultBrowserOpts(opts)
	// sets the maximum socket buffer size before throttling
	const bufferSize = options.browserBufferSize || 1024 * 512

	const bufferTimeout = opts.browserBufferTimeout || 1000

	const coerceToBuffer = !opts.objectMode

	// mutable socket reference - set once the socket is available
	let socketRef: WebSocket | null = null

	// the proxy is a transform stream that forwards data to the socket
	// it ensures data written to socket is a Buffer
	const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser)

	if (!opts.objectMode) {
		proxy._writev = writev.bind(proxy)
	}

	// the websocket connection (may be a Promise if transformWsUrl is async)
	const socketOrPromise = createBrowserWebSocket(client, opts)

	// methods for browserStreamBuilder

	function buildProxy(
		pOptions: IClientOptions,
		socketWrite: typeof socketWriteBrowser,
		socketEnd: typeof socketEndBrowser,
	) {
		const _proxy = new Transform({
			objectMode: pOptions.objectMode,
		})

		_proxy._write = socketWrite
		_proxy._flush = socketEnd

		return _proxy
	}

	function attachSocketHandlers(socket: WebSocket) {
		socketRef = socket
		proxy.on('close', () => {
			socket.close()
		})

		const eventListenerSupport =
			typeof socket.addEventListener !== 'undefined'

		// was already open when passed in
		if (socket.readyState === socket.OPEN) {
			stream = proxy
			stream.socket = socket
		} else {
			// socket is not open. Use this to buffer writes until it is opened
			stream = new BufferedDuplex(opts, proxy, socket)

			if (eventListenerSupport) {
				socket.addEventListener('open', onOpen)
			} else {
				socket.onopen = onOpen
			}
		}

		if (eventListenerSupport) {
			socket.addEventListener('close', onClose)
			socket.addEventListener('error', onError)
			socket.addEventListener('message', onMessage)
		} else {
			socket.onclose = onClose
			socket.onerror = onError
			socket.onmessage = onMessage
		}
	}

	if (socketOrPromise instanceof Promise) {
		// async case: create a BufferedDuplex immediately to buffer writes,
		// then wire up the real socket once the URL promise resolves.
		// Note: BufferedDuplex only stores the socket reference and does not
		// call any methods on it, so an empty placeholder is safe here.
		const placeholderSocket = {
			close() {},
		} as unknown as WebSocket
		stream = new BufferedDuplex(opts, proxy, placeholderSocket)
		socketOrPromise
			.then((socket) => {
				socketRef = socket
				;(stream as BufferedDuplex).socket = socket

				const eventListenerSupport =
					typeof socket.addEventListener !== 'undefined'

				if (eventListenerSupport) {
					socket.addEventListener('open', onOpen)
					socket.addEventListener('close', onClose)
					socket.addEventListener('error', onError)
					socket.addEventListener('message', onMessage)
				} else {
					socket.onopen = onOpen
					socket.onclose = onClose
					socket.onerror = onError
					socket.onmessage = onMessage
				}

				if (socket.readyState === socket.OPEN) {
					onOpen()
				}

				// wire up proxy close to close the real socket
				proxy.on('close', () => {
					socket.close()
				})
			})
			.catch((err) => {
				stream.destroy(err)
			})
	} else {
		attachSocketHandlers(socketOrPromise)
	}

	function onOpen() {
		debug('WebSocket onOpen')
		if (stream instanceof BufferedDuplex) {
			stream.socketReady()
		}
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/close_event
	 */
	function onClose(event: CloseEvent) {
		debug('WebSocket onClose', event)
		stream.end()
		stream.destroy()
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/error_event
	 */
	function onError(err: Event) {
		debug('WebSocket onError', err)
		const error = new Error('WebSocket error')
		error['event'] = err
		stream.destroy(error)
	}

	/**
	 * https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event
	 */
	async function onMessage(event: MessageEvent) {
		if (!proxy || !proxy.readable || !proxy.writable) {
			return
		}
		let { data } = event
		if (data instanceof ArrayBuffer) data = Buffer.from(data)
		else if (data instanceof Blob)
			data = Buffer.from(await new Response(data).arrayBuffer())
		else data = Buffer.from(data as string, 'utf8')
		proxy.push(data)
	}

	function socketWriteBrowser(
		chunk: any,
		enc: string,
		next: (err?: Error) => void,
	) {
		if (!socketRef) {
			next(new Error('WebSocket is not yet available'))
			return
		}
		if (socketRef.bufferedAmount > bufferSize) {
			// throttle data until buffered amount is reduced.
			setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next)
			return
		}

		if (coerceToBuffer && typeof chunk === 'string') {
			chunk = Buffer.from(chunk, 'utf8')
		}

		try {
			// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send (note this doesn't have a cb as second arg)
			socketRef.send(chunk)
		} catch (err) {
			return next(err)
		}

		next()
	}

	function socketEndBrowser(done: (error?: Error, data?: any) => void) {
		if (socketRef) {
			socketRef.close()
		}
		done()
	}

	// end methods for browserStreamBuilder

	return stream
}

export { browserStreamBuilder, streamBuilder }
