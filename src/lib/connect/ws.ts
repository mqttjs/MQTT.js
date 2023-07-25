import { StreamBuilder } from '../shared'

import { Buffer } from 'buffer'
import WS, { ClientOptions } from 'ws'
import _debug from 'debug'
import duplexify from 'duplexify'
import { DuplexOptions, Transform } from 'readable-stream'
import IS_BROWSER from '../is-browser'
import MqttClient, { IClientOptions } from '../client'

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
	let url = `${opts.protocol}://${opts.hostname}:${opts.port}${opts.path}`
	if (typeof opts.transformWsUrl === 'function') {
		url = opts.transformWsUrl(url, opts, client)
	}
	return url
}

function setDefaultOpts(opts: IClientOptions) {
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
	const socket = new WS(
		url,
		[websocketSubProtocol],
		opts.wsOptions as ClientOptions,
	)
	return socket
}

function createBrowserWebSocket(client: MqttClient, opts: IClientOptions) {
	const websocketSubProtocol =
		opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3
			? 'mqttv3.1'
			: 'mqtt'

	const url = buildUrl(opts, client)
	const socket = new WebSocket(url, [websocketSubProtocol])
	socket.binaryType = 'arraybuffer'
	return socket
}

const streamBuilder: StreamBuilder = (client, opts) => {
	debug('streamBuilder')
	const options = setDefaultOpts(opts)
	const url = buildUrl(options, client)
	const socket = createWebSocket(client, url, options)
	const webSocketStream = WS.createWebSocketStream(
		socket,
		options.wsOptions as DuplexOptions,
	)

	webSocketStream['url'] = url
	socket.on('close', () => {
		webSocketStream.destroy()
	})
	return webSocketStream
}

const browserStreamBuilder: StreamBuilder = (client, opts) => {
	debug('browserStreamBuilder')
	let stream
	const options = setDefaultBrowserOpts(opts)
	// sets the maximum socket buffer size before throttling
	const bufferSize = options.browserBufferSize || 1024 * 512

	const bufferTimeout = opts.browserBufferTimeout || 1000

	const coerceToBuffer = !opts.objectMode

	const socket = createBrowserWebSocket(client, opts)
	const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser)

	if (!opts.objectMode) {
		proxy._writev = writev
	}
	proxy.on('close', () => {
		socket.close()
	})

	const eventListenerSupport = typeof socket.addEventListener !== 'undefined'

	// was already open when passed in
	if (socket.readyState === socket.OPEN) {
		stream = proxy
	} else {
		stream = duplexify(undefined, undefined, opts)
		if (!opts.objectMode) {
			stream._writev = writev
		}

		if (eventListenerSupport) {
			socket.addEventListener('open', onOpen)
		} else {
			socket.onopen = onOpen
		}
	}

	stream.socket = socket

	if (eventListenerSupport) {
		socket.addEventListener('close', onClose)
		socket.addEventListener('error', onError)
		socket.addEventListener('message', onMessage)
	} else {
		socket.onclose = onClose
		socket.onerror = onError
		socket.onmessage = onMessage
	}

	// methods for browserStreamBuilder

	function buildProxy(pOptions: IClientOptions, socketWrite, socketEnd) {
		const _proxy = new Transform({
			objectMode: pOptions.objectMode,
		})

		_proxy._write = socketWrite
		_proxy._flush = socketEnd

		return _proxy
	}

	function onOpen() {
		stream.setReadable(proxy)
		stream.setWritable(proxy)
		stream.emit('connect')
	}

	function onClose() {
		stream.end()
		stream.destroy()
	}

	function onError(err: Event) {
		stream.destroy(err)
	}

	function onMessage(event: MessageEvent) {
		let { data } = event
		if (data instanceof ArrayBuffer) data = Buffer.from(data)
		else data = Buffer.from(data, 'utf8')
		proxy.push(data)
	}

	// this is to be enabled only if objectMode is false
	function writev(chunks: any, cb: (err?: Error) => void) {
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

	function socketWriteBrowser(
		chunk: any,
		enc: string,
		next: (err?: Error) => void,
	) {
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

	function socketEndBrowser(done) {
		socket.close()
		done()
	}

	// end methods for browserStreamBuilder

	return stream
}

export default IS_BROWSER ? browserStreamBuilder : streamBuilder
