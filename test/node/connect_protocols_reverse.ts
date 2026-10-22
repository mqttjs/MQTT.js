import http from 'http'
import assert from 'assert'
import { after, before, describe, it } from 'node:test'
import WebSocket from 'ws'
import MQTTConnection from 'mqtt-connection'
import mqtt, { type MqttClient } from '../../src'
import getPorts from './helpers/port_list'
import { MqttServer } from './server'

const ports = getPorts(7)
const TCP_PORT = ports.PORT
const WS_PORT = ports.PORTAND40

function waitForConnect(client: MqttClient): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error('timed out waiting for connect')),
			5000,
		)
		client.once('connect', () => {
			clearTimeout(timer)
			resolve()
		})
		client.once('error', (err) => {
			clearTimeout(timer)
			reject(err)
		})
	})
}

describe('connect() protocol builders are picked per client (reverse order)', () => {
	let tcpServer: MqttServer
	let httpServer: http.Server
	let wsServer: WebSocket.Server

	before(async () => {
		tcpServer = new MqttServer((client) => {
			client.on('connect', () => client.connack({ returnCode: 0 }))
			client.on('error', () => {})
		})
		await new Promise<void>((resolve) =>
			tcpServer.listen(TCP_PORT, resolve),
		)

		httpServer = http.createServer()
		wsServer = new WebSocket.Server({
			server: httpServer,
			handleProtocols: (protocols: Set<string>) => [...protocols][0],
		})
		wsServer.on('connection', (ws) => {
			const connection = new MQTTConnection(
				WebSocket.createWebSocketStream(ws),
			)
			connection.on('connect', () =>
				connection.connack({ returnCode: 0 }),
			)
			connection.on('error', () => {})
		})
		await new Promise<void>((resolve) =>
			httpServer.listen(WS_PORT, resolve),
		)
	})

	after(async () => {
		wsServer.close()
		httpServer.close()
		await new Promise<void>((resolve) => tcpServer.close(() => resolve()))
	})

	it(
		'does not let a plain client change the builder of a later forceNativeWebSocket client',
		{ timeout: 10000 },
		async () => {
			const tcpClient = mqtt.connect(`mqtt://127.0.0.1:${TCP_PORT}`, {
				reconnectPeriod: 0,
			})
			await waitForConnect(tcpClient)
			assert.strictEqual(tcpClient.options.protocol, 'mqtt')
			await tcpClient.endAsync(true)

			const nativeClient = mqtt.connect(`ws://127.0.0.1:${WS_PORT}`, {
				forceNativeWebSocket: true,
				reconnectPeriod: 0,
			})
			await waitForConnect(nativeClient)
			// the browser builder wraps a native WebSocket, exposed on the
			// stream; the Node `ws` builder does not set one
			const stream = nativeClient.stream as unknown as Record<
				string,
				unknown
			>
			assert.ok(
				stream.socket instanceof globalThis.WebSocket,
				'expected the stream to wrap a native WebSocket',
			)
			await nativeClient.endAsync(true)
		},
	)
})
