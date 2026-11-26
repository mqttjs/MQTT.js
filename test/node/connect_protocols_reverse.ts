import assert from 'assert'
import { afterEach, describe, it } from 'node:test'
import mqtt, { type IClientOptions, type MqttClient } from '../../src'
import { BufferedDuplex } from '../../src/lib/BufferedDuplex'
import getPorts from './helpers/port_list'

// A separate file from connect_protocols.ts: the builders are cached per
// process, so the first connect() of the process must be a plain client.
const PORT = getPorts(7).PORT

describe('connect() picks the protocol builders per client (reverse order)', () => {
	const clients: MqttClient[] = []
	const connect = (url: string, opts: IClientOptions = {}) => {
		const client = mqtt.connect(url, { reconnectPeriod: 0, ...opts })
		clients.push(client)
		return client
	}

	afterEach(() => {
		clients.splice(0).forEach((client) => client.end(true))
	})

	it('a plain client does not change a later forceNativeWebSocket client', () => {
		const tcpClient = connect(`mqtt://127.0.0.1:${PORT}`)
		assert.strictEqual(tcpClient.options.protocol, 'mqtt')

		const nativeClient = connect(`ws://127.0.0.1:${PORT}`, {
			forceNativeWebSocket: true,
		})
		// only the native WebSocket builder wraps its socket in a BufferedDuplex
		assert.ok(nativeClient.stream instanceof BufferedDuplex)
	})
})
