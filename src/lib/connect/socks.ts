import _debug from 'debug'
import { Duplex } from 'stream'
import { SocksClient, SocksProxy } from 'socks'
import { lookup } from 'dns'
import { SocksProxyType } from 'socks/typings/common/constants'
import { IStream } from '../shared'
import { promisify } from 'util'
import { Socket } from 'net'
import assert from 'assert'

const debug = _debug('mqttjs:socks')

class ProxyStream extends Duplex {
	private _flowing = false

	private _socket?: Socket

	constructor() {
		super({ autoDestroy: false })

		this.cork()
	}

	_start(socket: Socket): void {
		debug('proxy stream started')

		assert(!this._socket)

		this._socket = socket

		if (!this._flowing) socket.pause()

		socket.on('data', this._onData)
		socket.on('end', this._onEnd)
		socket.on('error', this._onError)
		socket.on('close', this._onClose)

		socket.emit('connect')

		this.uncork()
	}

	_write(
		chunk: any,
		encoding: BufferEncoding,
		callback: (error?: Error | null) => void,
	): void {
		assert(this._socket)

		this._socket.write(chunk, callback)
	}

	_read(size: number): void {
		this._flowing = true

		this._socket?.resume?.()
	}

	_destroy(
		error: Error | null,
		callback: (error?: Error | null) => void,
	): void {
		this._socket?.destroy?.(error)

		callback(error)
	}

	_onData = (chunk: any): void => {
		assert(this._socket)

		this._flowing = this.push(chunk)

		if (!this._flowing) this._socket.pause()
	}

	_onEnd = (): void => {
		debug('proxy stream received EOF')

		this.push(null)
	}

	_onClose = (): void => {
		debug('proxy stream closed')

		this.destroy()
	}

	_onError = (err: any): void => {
		debug('proxy stream died with error %s', err)

		this.destroy(err)
	}
}

function fatal<T>(e: T): T {
	try {
		if ((e as any).code === undefined) (e as any).code = 'SOCKS'
		return e
	} catch {
		return e
	}
}

function typeFromProtocol(
	proto: string,
): [SocksProxyType | undefined, boolean] {
	switch (proto) {
		case 'socks5h:':
			return [5, true]

		case 'socks4a:':
			return [4, true]

		case 'socks5:':
			return [5, false]

		case 'socks4:':
			return [4, false]

		default:
			return [undefined, false]
	}
}

function parseSocksUrl(url: string): [SocksProxy, boolean] {
	const parsedUrl = new URL(url)

	if (parsedUrl.pathname || parsedUrl.hash || parsedUrl.search) {
		throw fatal(new Error('bad SOCKS URL'))
	}

	const [type, resolveThroughProxy] = typeFromProtocol(parsedUrl.protocol)
	if (!type) {
		throw fatal(new Error('bad SOCKS URL: invalid protocol'))
	}

	const port = parseInt(parsedUrl.port, 10)
	if (Number.isNaN(port)) {
		throw fatal(new Error('bad SOCKS URL: invalid port'))
	}

	const proxy: SocksProxy = {
		host: parsedUrl.hostname,
		port,
		type,
	}

	return [proxy, resolveThroughProxy]
}

async function connectSocks(
	destinationHost: string,
	destinationPort: number,
	socksUrl: string,
	stream: ProxyStream,
	timeout?: number,
): Promise<void> {
	const [proxy, resolveThroughProxy] = parseSocksUrl(socksUrl)

	if (!resolveThroughProxy) {
		debug('resolving %s locally', destinationHost)

		destinationHost = (
			await promisify(lookup)(destinationHost, {
				family: proxy.type === 4 ? 4 : 0,
			})
		).address
	}

	debug(
		'establishing SOCKS%d connection to %s:%d via %s:%d',
		proxy.type,
		destinationHost,
		destinationPort,
		proxy.host,
		proxy.port,
	)

	const socksClient = new SocksClient({
		command: 'connect',
		destination: {
			host: destinationHost,
			port: destinationPort,
		},
		proxy: { ...proxy },
		timeout,
	})
	socksClient.connect()

	socksClient.on('established', ({ socket }) => stream._start(socket))

	socksClient.on('error', (e) => {
		debug('SOCKS5 failed: %s', e)
		stream.destroy(fatal(e))
	})
}

export default function openSocks(
	destinationHost: string,
	destinationPort: number,
	socksUrl: string,
	timeout?: number,
): IStream {
	debug(
		'SOCKS connection to %s:%d via %s',
		destinationHost,
		destinationPort,
		socksUrl,
	)

	const stream = new ProxyStream()

	connectSocks(
		destinationHost,
		destinationPort,
		socksUrl,
		stream,
		timeout,
	).catch((e) => {
		stream.destroy(e)
	})

	return stream
}
