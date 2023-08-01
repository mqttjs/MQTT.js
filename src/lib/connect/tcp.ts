import { StreamBuilder } from '../shared'

import net from 'net'
import _debug from 'debug'
import { Duplex } from 'readable-stream'

const debug = _debug('mqttjs:tcp')
/*
  variables port and host can be removed since
  you have all required information in opts object
*/
const buildStream: StreamBuilder = (client, opts) => {
	opts.port = opts.port || 1883
	opts.hostname = opts.hostname || opts.host || 'localhost'

	const { port } = opts
	const host = opts.hostname

	debug('port %d and host %s', port, host)
	return net.createConnection(port, host)
}

export default buildStream
