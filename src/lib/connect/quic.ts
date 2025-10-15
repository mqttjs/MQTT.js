import { StreamBuilder } from '../shared'
import _debug from 'debug'
import { createSocket } from 'node:quic'

const debug = _debug('mqttjs:quic')

const buildStream: StreamBuilder = (client, opts) => {
	opts.port = opts.port || 8885
	opts.host = opts.hostname || opts.host || 'localhost'
	opts.servername = opts.host

	opts.rejectUnauthorized = opts.rejectUnauthorized !== false

	delete opts.path

	debug(
		'port %d host %s rejectUnauthorized %b',
		opts.port,
		opts.host,
		opts.rejectUnauthorized,
	)

	const socket = createSocket({
		client: {
			alpn: opts.alpn || 'mqtt',
		},
	})

	const req = socket.connect({
		address: opts.host,
		port: opts.port || 8885,
		cert: opts.cert,
		key: opts.key,
		idleTimeout: 0, // disable timeout
	})

	const stream = req.openStream()

	req.on('secure', (servername) => {
		// servername is checked for any string for authorisation acceptance
		if (opts.rejectUnauthorized && !servername) {
			req.emit('error', new Error('TLS not authorized'))
		} else {
			req.removeListener('error', handleTLSErrors)
		}
	})

	function handleTLSErrors(err) {
		if (opts.rejectUnauthorized) {
			client.emit('error', err)
		}

		stream.end()
		socket.close()
	}

	req.on('error', handleTLSErrors)
	return stream
}

export default buildStream
