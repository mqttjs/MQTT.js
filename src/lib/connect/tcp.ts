import { type StreamBuilder } from '../shared'

import net from 'net'
import _debug from 'debug'
import openSocks from './socks'

const debug = _debug('mqttjs:tcp')
/*
  variables port and host can be removed since
  you have all required information in opts object
*/
const buildStream: StreamBuilder = (client, opts) => {
	opts.port = opts.port || 1883
	opts.hostname = opts.hostname || opts.host || 'localhost'

	if (opts.socksProxy) {
		return openSocks(opts.hostname, opts.port, opts.socksProxy, {
			timeout: opts.socksTimeout,
		})
	}

	const { port, path } = opts
	const host = opts.hostname

	debug('port %d and host %s', port, host)
	return net.createConnection({ port, host, path })
}

export default buildStream
