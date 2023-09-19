import http from 'http'
import WebSocket from 'ws'
import MQTTConnection from 'mqtt-connection'
import assert from 'assert'
import abstractClientTests from './abstract_client'
import ports from './helpers/port_list'
import { MqttServerNoWait } from './server'
import * as mqtt from '../src/mqtt'
import { IClientOptions } from '../src/lib/client'

const port = 9999
const httpServer = http.createServer()
let lastProcotols = new Set<string>()
function attachWebsocketServer(httpServer2) {
	const webSocketServer = new WebSocket.Server({
		server: httpServer2,
		handleProtocols: (protocols: Set<string>, request: any) => {
			lastProcotols = protocols
			return [...protocols][0]
		},
		perMessageDeflate: false,
	})

	webSocketServer.on('connection', (ws) => {
		const stream = WebSocket.createWebSocketStream(ws)
		const connection = new MQTTConnection(stream)
		connection.protocol = ws.protocol
		httpServer2.emit('client', connection)
		stream.on('error', () => {})
		connection.on('error', () => {})
	})

	return httpServer2
}

function attachClientEventHandlers(client) {
	client.on('connect', (packet) => {
		if (packet.clientId === 'invalid') {
			client.connack({ returnCode: 2 })
		} else {
			httpServer.emit('connect', client)
			client.connack({ returnCode: 0 })
		}
	})

	client.on('publish', (packet) => {
		setImmediate(() => {
			switch (packet.qos) {
				case 0:
					break
				case 1:
					client.puback(packet)
					break
				case 2:
					client.pubrec(packet)
					break
			}
		})
	})

	client.on('pubrel', (packet) => {
		client.pubcomp(packet)
	})

	client.on('pubrec', (packet) => {
		client.pubrel(packet)
	})

	client.on('pubcomp', () => {
		// Nothing to be done
	})

	client.on('subscribe', (packet) => {
		client.suback({
			messageId: packet.messageId,
			granted: packet.subscriptions.map((e) => e.qos),
		})
	})

	client.on('unsubscribe', (packet) => {
		client.unsuback(packet)
	})

	client.on('pingreq', () => {
		client.pingresp()
	})
}

attachWebsocketServer(httpServer)

httpServer.on('client', attachClientEventHandlers).listen(port)

describe('Websocket Client', () => {
	const baseConfig: IClientOptions = { protocol: 'ws', port }

	function makeOptions(custom?: IClientOptions): IClientOptions {
		return { ...baseConfig, ...(custom || {}) }
	}

	it('should use mqtt as the protocol by default', function test(done) {
		httpServer.once('client', (client) => {
			assert.strictEqual(client.protocol, 'mqtt')
		})
		const client = mqtt.connect(makeOptions())

		client.on('connect', () => {
			client.end(true, (err) => done(err))
		})
	})

	it('should be able to transform the url (for e.g. to sign it)', function test(done) {
		const baseUrl = 'ws://localhost:9999/mqtt'
		const sig = '?AUTH=token'
		const expected = baseUrl + sig
		let actual: string
		const opts = makeOptions({
			path: '/mqtt',
			transformWsUrl(url, opt, client) {
				assert.equal(url, baseUrl)
				assert.strictEqual(opt, opts)
				assert.strictEqual(client.options, opts)
				assert.strictEqual(typeof opt.transformWsUrl, 'function')
				assert(client instanceof mqtt.MqttClient)
				url += sig
				actual = url
				return url
			},
		})
		const client = mqtt.connect(opts)

		client.on('connect', () => {
			// `url` is set in `connect/ws.ts` `streamBuilder`
			assert.equal((client.stream as any).url, expected)
			assert.equal(actual, expected)
			client.end(true, (err) => done(err))
		})
	})

	it('should be able to create custom Websocket instance', function test(done) {
		const baseUrl = 'ws://localhost:9999/mqtt'
		let urlInCallback: string
		const opts = makeOptions({
			path: '/mqtt',
			createWebsocket(
				url: string,
				websocketSubProtocols: string[],
				options: IClientOptions,
			) {
				urlInCallback = url
				assert.equal(url, baseUrl)
				const subProtocols = [
					websocketSubProtocols[0],
					'myCustomSubprotocol',
				]
				return new WebSocket(url, subProtocols)
			},
		})
		const client = mqtt.connect(opts)
		client.on('connect', () => {
			assert.equal((client.stream as any).url, urlInCallback)
			assert.equal(baseUrl, urlInCallback)
			assert.equal('myCustomSubprotocol', [...lastProcotols][1])
			client.end(true, (err) => done(err))
		})
	})

	it('should use mqttv3.1 as the protocol if using v3.1', function test(done) {
		httpServer.once('client', (client) => {
			assert.strictEqual(client.protocol, 'mqttv3.1')
		})

		const opts = makeOptions({
			protocolId: 'MQIsdp',
			protocolVersion: 3,
		})

		const client = mqtt.connect(opts)

		client.on('connect', () => {
			client.end(true, (err) => done(err))
		})
	})

	describe('reconnecting', () => {
		it('should reconnect to multiple host-ports-protocol combinations if servers is passed', function test(done) {
			let serverPort42Connected = false
			const handler = (serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({ returnCode: 0 })
				})
			}
			this.timeout(15000)
			const actualURL41 = 'wss://localhost:9917/'
			const actualURL42 = 'ws://localhost:9918/'
			const serverPort41 = new MqttServerNoWait(handler).listen(
				ports.PORTAND41,
			)
			const serverPort42 = new MqttServerNoWait(handler).listen(
				ports.PORTAND42,
			)

			serverPort42.on('listening', () => {
				const client = mqtt.connect({
					protocol: 'wss',
					servers: [
						{
							port: ports.PORTAND42,
							host: 'localhost',
							protocol: 'ws',
						},
						{ port: ports.PORTAND41, host: 'localhost' },
					],
					keepalive: 50,
				})
				serverPort41.once('client', (c) => {
					assert.equal(
						(client.stream as any).url,
						actualURL41,
						'Protocol for second client should use the default protocol: wss, on port: port + 41.',
					)
					assert(serverPort42Connected)
					c.stream.destroy()
					client.end(true, (err1) => {
						serverPort41.close((err2) => {
							done(err1 || err2)
						})
					})
				})
				serverPort42.once('client', (c) => {
					serverPort42Connected = true
					assert.equal(
						(client.stream as any).url,
						actualURL42,
						'Protocol for connection should use ws, on port: port + 42.',
					)
					c.stream.destroy()
					serverPort42.close()
				})

				client.once('connect', () => {
					client.stream.destroy()
				})
			})
		})
	})

	abstractClientTests(httpServer, makeOptions())
})
