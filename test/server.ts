import net from 'net'
import tls, { TlsOptions } from 'tls'
import Connection from 'mqtt-connection'
import { Duplex } from 'stream'

export type MqttServerListener = (client: Connection) => void

/**
 * MqttServer
 *
 * @param {Function} listener - fired on client connection
 */
export class MqttServer extends net.Server {
	connectionList: Duplex[]

	constructor(listener: MqttServerListener) {
		super()
		this.connectionList = []

		this.on('connection', (duplex) => {
			this.connectionList.push(duplex)
			const connection = new Connection(duplex, () => {
				this.emit('client', connection)
			})
		})

		if (listener) {
			this.on('client', listener)
		}
	}
}

/**
 * MqttServerNoWait (w/o waiting for initialization)
 *
 * @param {Function} listener - fired on client connection
 */
export class MqttServerNoWait extends net.Server {
	connectionList: Duplex[]

	constructor(listener: MqttServerListener) {
		super()
		this.connectionList = []

		this.on('connection', (duplex) => {
			this.connectionList.push(duplex)
			const connection = new Connection(duplex)
			// do not wait for connection to return to send it to the client.
			this.emit('client', connection)
		})

		if (listener) {
			this.on('client', listener)
		}
	}
}

/**
 * MqttSecureServer
 *
 * @param {Object} opts - server options
 * @param {Function} listener
 */
export class MqttSecureServer extends tls.Server {
	connectionList: Duplex[]

	constructor(opts: TlsOptions, listener: MqttServerListener) {
		if (typeof opts === 'function') {
			listener = opts
			opts = {}
		}

		// sets a listener for the 'connection' event
		super(opts)
		this.connectionList = []

		this.on('secureConnection', (socket) => {
			this.connectionList.push(socket)
			const connection = new Connection(socket, () => {
				this.emit('client', connection)
			})
		})

		if (listener) {
			this.on('client', listener)
		}
	}

	setupConnection(duplex: Duplex) {
		const connection = new Connection(duplex, () => {
			this.emit('client', connection)
		})
	}
}
