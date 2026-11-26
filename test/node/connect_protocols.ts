import assert from 'assert'
import { afterEach, describe, it } from 'node:test'
import mqtt, { type IClientOptions, type MqttClient } from '../../src'
import { BufferedDuplex } from '../../src/lib/BufferedDuplex'
import getPorts from './helpers/port_list'

// connect() picks the stream builder synchronously, so no broker is needed
const PORT = getPorts(6).PORT

describe('connect() picks the protocol builders per client', () => {
	const clients: MqttClient[] = []
	const connect = (url: string, opts: IClientOptions = {}) => {
		const client = mqtt.connect(url, { reconnectPeriod: 0, ...opts })
		clients.push(client)
		return client
	}

	afterEach(() => {
		clients.splice(0).forEach((client) => client.end(true))
	})

	it('a forceNativeWebSocket client does not change later plain clients', () => {
		const nativeClient = connect(`ws://127.0.0.1:${PORT}`, {
			forceNativeWebSocket: true,
		})
		// only the native WebSocket builder wraps its socket in a BufferedDuplex
		assert.ok(nativeClient.stream instanceof BufferedDuplex)

		const tcpClient = connect(`mqtt://127.0.0.1:${PORT}`)
		assert.strictEqual(tcpClient.options.protocol, 'mqtt')

		const wsClient = connect(`ws://127.0.0.1:${PORT}`)
		assert.ok(!(wsClient.stream instanceof BufferedDuplex))
	})
})
