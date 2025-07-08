import { type StreamBuilder } from '../shared'

import net from 'net'
import _debug from 'debug'
import openSocks, { type SocksConnectionOptions } from './socks'
import { type IClientOptions } from '../client'

const debug = _debug('mqttjs:tcp')
/*
  variables port and host can be removed since
  you have all required information in opts object
*/
const buildStream: StreamBuilder = (_client, opts) => {
	const scopedOpts: IClientOptions = opts ?? {}

	scopedOpts.port = opts?.port ?? 1883
	// @TODO: Defaulting localhost has a few minor pitfalls. Notably because localhost triggers DNS resolution which might not map to 127.0.0.1 and create problems.
	scopedOpts.hostname = opts?.hostname ?? opts?.host ?? 'localhost'

	if (scopedOpts.socksProxy) {
		const socksConnectionOptions: SocksConnectionOptions = {}

		if (scopedOpts.socksTimeout !== undefined) {
			socksConnectionOptions.timeout = scopedOpts.socksTimeout
		}
		return openSocks(
			scopedOpts.hostname,
			scopedOpts.port,
			scopedOpts.socksProxy,
			socksConnectionOptions,
		)
	}

	debug('port %d and host %s', scopedOpts.port, scopedOpts.hostname)
	return net.createConnection({
		port: scopedOpts.port,
		host: scopedOpts.hostname,
		path: scopedOpts.path,
	})
}

export default buildStream
