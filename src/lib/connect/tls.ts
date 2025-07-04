import tls, { type TLSSocket } from 'tls'
import net from 'net'
import _debug from 'debug'
import { type StreamBuilder } from '../shared'
import { type IClientOptions } from '../client'
import openSocks from './socks'

const debug = _debug('mqttjs:tls')

function connect(opts: IClientOptions): TLSSocket {
	const { host, port, socksProxy, ...rest } = opts

	return tls.connect(
		socksProxy
			? {
					...rest,
					socket: openSocks(host, port, socksProxy, {
						timeout: opts.socksTimeout,
					}),
				}
			: opts,
	)
}

const buildStream: StreamBuilder = (client, opts) => {
	opts.port = opts.port || 8883
	opts.host = opts.hostname || opts.host || 'localhost'

	if (net.isIP(opts.host) === 0) {
		opts.servername = opts.host
	}

	opts.rejectUnauthorized = opts.rejectUnauthorized !== false

	delete opts.path

	debug(
		'port %d host %s rejectUnauthorized %b',
		opts.port,
		opts.host,
		opts.rejectUnauthorized,
	)

	const connection = connect(opts)
	connection.on('secureConnect', () => {
		if (opts.rejectUnauthorized && !connection.authorized) {
			connection.emit('error', new Error('TLS not authorized'))
		} else {
			connection.removeListener('error', handleTLSerrors)
		}
	})

	function handleTLSerrors(err: Error) {
		// How can I get verify this error is a tls error?
		if (opts.rejectUnauthorized) {
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

export default buildStream
