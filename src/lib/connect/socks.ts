import _debug from 'debug'
import duplexify, { Duplexify } from 'duplexify'
import { SocksClient, SocksProxy } from 'socks'
import { lookup } from 'dns'
import { SocksProxyType } from 'socks/typings/common/constants'
import { IStream } from '../shared'
import { promisify } from 'util'

const debug = _debug('mqttjs:socks')

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
	stream: Duplexify,
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

	socksClient.on('established', ({ socket }) => {
		stream.setReadable(socket)
		stream.setWritable(socket)

		socket.on('close', () => {
			debug('SOCKS5 socket closed')
			stream.destroy()
		})

		socket.on('error', (e) => {
			debug('SOCKS5 socket error: %s', e)
			stream.destroy(e)
		})

		stream.emit('connect')
	})

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

	const stream = duplexify()

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
