import * as mqtt from '../src/mqtt'
import { assert } from 'chai'
import { fork } from 'child_process'
import path from 'path'
import net from 'net'
import eos from 'end-of-stream'
import mqttPacket from 'mqtt-packet'
import { Duplex } from 'readable-stream'
import Connection from 'mqtt-connection'
import util from 'util'
import ports from './helpers/port_list'
import serverBuilder from './server_helpers_for_client_tests'
import _debug from 'debug'
import { MqttServer } from './server'
import abstractClientTests from './abstract_client'
import { IClientOptions } from 'src/lib/client'

const debug = _debug('mqttjs:client-test')

describe('MqttClient', () => {
	let client: mqtt.MqttClient
	const server = serverBuilder('mqtt')
	const config: IClientOptions = { protocol: 'mqtt', port: ports.PORT }
	server.listen(ports.PORT)

	after(() => {
		// clean up and make sure the server is no longer listening...
		if (server.listening) {
			server.close()
		}
	})

	abstractClientTests(server, config)

	describe('creating', () => {
		it('should allow instantiation of MqttClient', function test(done) {
			try {
				client = new mqtt.MqttClient(() => {
					throw Error('break')
				}, {})
				client.end()
			} catch (err) {
				assert.strictEqual(err.message, 'break')
				done()
			}
		})

		it('should disable number cache if specified in options', function test(done) {
			try {
				assert.isTrue(mqttPacket.writeToStream.cacheNumbers)
				client = new mqtt.MqttClient(
					() => {
						throw Error('break')
					},
					{ writeCache: false },
				)
				client.end()
			} catch (err) {
				assert.isFalse(mqttPacket.writeToStream.cacheNumbers)
				done()
			}
		})
	})

	describe('message ids', () => {
		it('should increment the message id', function test(done) {
			client = mqtt.connect(config)
			const currentId = client['_nextId']()

			assert.equal(client['_nextId'](), currentId + 1)
			client.end((err) => done(err))
		})

		it("should not throw an error if packet's messageId is not found when receiving a pubrel packet", function test(done) {
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({ returnCode: 0 })
					serverClient.pubrel({
						messageId: Math.floor(Math.random() * 9000) + 1000,
					})
				})
			})

			server2.listen(ports.PORTAND49, () => {
				client = mqtt.connect({
					port: ports.PORTAND49,
					host: 'localhost',
				})

				client.on('packetsend', (packet) => {
					if (packet.cmd === 'pubcomp') {
						client.end((err1) => {
							server2.close((err2) => {
								done(err1 || err2)
							})
						})
					}
				})
			})
		})

		it('should not go overflow if the TCP frame contains a lot of PUBLISH packets', function test(done) {
			const parser = mqttPacket.parser()
			const max = 1000
			let count = 0
			const duplex = new Duplex({
				read(n) {},
				write(chunk, enc, cb) {
					parser.parse(chunk)
					cb() // nothing to do
				},
			})
			client = new mqtt.MqttClient(() => duplex, {})

			client.on('message', (t, p, packet) => {
				if (++count === max) {
					// BUGBUG: the client.end callback never gets called here
					// client.end((err) => done(err))
					client.end()
					done()
				}
			})

			parser.on('packet', (packet) => {
				const packets = []

				if (packet.cmd === 'connect') {
					duplex.push(
						mqttPacket.generate({
							cmd: 'connack',
							sessionPresent: false,
							returnCode: 0,
						}),
					)

					for (let i = 0; i < max; i++) {
						packets.push(
							mqttPacket.generate({
								cmd: 'publish',
								topic: 'hello',
								payload: Buffer.from('world'),
								retain: false,
								dup: false,
								messageId: i + 1,
								qos: 1,
							}),
						)
					}

					duplex.push(Buffer.concat(packets))
				}
			})
		})
	})

	describe('flushing', () => {
		it('should attempt to complete pending unsub and send on ping timeout', function test(done) {
			this.timeout(10000)
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({ returnCode: 0 })
				})
			}).listen(ports.PORTAND72)

			let pubCallbackCalled = false
			let unsubscribeCallbackCalled = false
			client = mqtt.connect({
				port: ports.PORTAND72,
				host: 'localhost',
				keepalive: 1,
				connectTimeout: 350,
				reconnectPeriod: 0,
			})
			client.once('connect', () => {
				client.publish(
					'fakeTopic',
					'fakeMessage',
					{ qos: 1 },
					(err) => {
						assert.exists(err)
						pubCallbackCalled = true
					},
				)
				client.unsubscribe('fakeTopic', (err, result) => {
					assert.exists(err)
					unsubscribeCallbackCalled = true
				})
				setTimeout(() => {
					client.end((err1) => {
						assert.strictEqual(
							pubCallbackCalled && unsubscribeCallbackCalled,
							true,
							'callbacks not invoked',
						)
						server2.close((err2) => {
							done(err1 || err2)
						})
					})
				}, 5000)
			})
		})
	})

	describe('reconnecting', () => {
		it('should attempt to reconnect once server is down', function test(done) {
			this.timeout(30000)

			const innerServer = fork(
				path.join(__dirname, 'helpers', 'server_process.ts'),
				{
					execArgv: ['--inspect', '-r', 'ts-node/register'],
				},
			)
			innerServer.on('close', (code) => {
				if (code) {
					done(util.format('child process closed with code %d', code))
				}
			})

			innerServer.on('exit', (code) => {
				if (code) {
					done(util.format('child process exited with code %d', code))
				}
			})

			client = mqtt.connect({
				port: 3481,
				host: 'localhost',
				keepalive: 1,
			})
			client.once('connect', () => {
				innerServer.kill('SIGINT') // mocks server shutdown
				client.once('close', () => {
					assert.exists(client['reconnectTimer'])
					client.end(true, (err) => done(err))
				})
			})
		})

		it('should reconnect if a connack is not received in an interval', function test(done) {
			this.timeout(2000)

			const server2 = net.createServer().listen(ports.PORTAND43)

			server2.on('connection', (c) => {
				eos(c, () => {
					server2.close()
				})
			})

			server2.on('listening', () => {
				client = mqtt.connect({
					servers: [
						{ port: ports.PORTAND43, host: 'localhost_fake' },
						{ port: ports.PORT, host: 'localhost' },
					],
					connectTimeout: 500,
				})

				server.once('client', () => {
					client.end(false, (err) => {
						done(err)
					})
				})

				client.once('connect', () => {
					client.stream.destroy()
				})
			})
		})

		it('should not be cleared by the connack timer', function test(done) {
			this.timeout(4000)

			const server2 = net.createServer().listen(ports.PORTAND44)

			server2.on('connection', (c) => {
				c.destroy()
			})

			server2.once('listening', () => {
				const connectTimeout = 1000
				const reconnectPeriod = 100
				const expectedReconnects = Math.floor(
					connectTimeout / reconnectPeriod,
				)
				let reconnects = 0
				client = mqtt.connect({
					port: ports.PORTAND44,
					host: 'localhost',
					connectTimeout,
					reconnectPeriod,
				})

				client.on('reconnect', () => {
					reconnects++
					if (reconnects >= expectedReconnects) {
						client.end(true, (err) => done(err))
					}
				})
			})
		})

		it('should not keep requeueing the first message when offline', function test(done) {
			this.timeout(2500)

			const server2 = serverBuilder('mqtt').listen(ports.PORTAND45)
			client = mqtt.connect({
				port: ports.PORTAND45,
				host: 'localhost',
				connectTimeout: 350,
				reconnectPeriod: 300,
			})

			server2.on('client', (serverClient) => {
				client.publish('hello', 'world', { qos: 1 }, () => {
					serverClient.destroy()
					server2.close(() => {
						debug('now publishing message in an offline state')
						client.publish('hello', 'world', { qos: 1 })
					})
				})
			})

			setTimeout(() => {
				if (client.queue.length === 0) {
					debug('calling final client.end()')
					client.end(true, (err) => done(err))
				} else {
					debug('calling client.end()')
					// Do not call done. We want to trigger a reconnect here.
					client.end(true)
				}
			}, 2000)
		})

		it('should not send the same subscribe multiple times on a flaky connection', function test(done) {
			this.timeout(3500)

			const KILL_COUNT = 4
			const subIds = {}
			let killedConnections = 0
			client = mqtt.connect({
				port: ports.PORTAND46,
				host: 'localhost',
				connectTimeout: 350,
				reconnectPeriod: 300,
			})

			const server2 = new MqttServer((serverClient) => {
				debug('client received on server2.')
				debug('subscribing to topic `topic`')
				client.subscribe('topic', () => {
					debug(
						'once subscribed to topic, end client, destroy serverClient, and close server.',
					)
					serverClient.destroy()
					server2.close(() => {
						client.end(true, (err) => done(err))
					})
				})

				serverClient.on('subscribe', (packet) => {
					if (killedConnections < KILL_COUNT) {
						// Kill the first few sub attempts to simulate a flaky connection
						killedConnections++
						serverClient.destroy()
					} else {
						// Keep track of acks
						if (!subIds[packet.messageId]) {
							subIds[packet.messageId] = 0
						}
						subIds[packet.messageId]++
						if (subIds[packet.messageId] > 1) {
							done(
								new Error(
									`Multiple duplicate acked subscriptions received for messageId ${packet.messageId}`,
								),
							)
							client.end(true)
							serverClient.end()
							server2.close()
						}

						serverClient.suback({
							messageId: packet.messageId,
							granted: packet.subscriptions.map((e) => e.qos),
						})
					}
				})
			}).listen(ports.PORTAND46)
		})

		it('should not fill the queue of subscribes if it cannot connect', function test(done) {
			this.timeout(2500)
			const server2 = net.createServer((stream) => {
				const serverClient = new Connection(stream)

				serverClient.on('error', (e) => {
					/* do nothing */
				})
				serverClient.on('connect', (packet) => {
					serverClient.connack({ returnCode: 0 })
					serverClient.destroy()
				})
			})

			server2.listen(ports.PORTAND48, () => {
				client = mqtt.connect({
					port: ports.PORTAND48,
					host: 'localhost',
					connectTimeout: 350,
					reconnectPeriod: 300,
				})

				client.subscribe('hello')

				setTimeout(() => {
					assert.equal(client.queue.length, 1)
					client.end(true, (err) => done(err))
				}, 1000)
			})
		})

		it('should not send the same publish multiple times on a flaky connection', function test(done) {
			this.timeout(3500)

			const KILL_COUNT = 4
			let killedConnections = 0
			const pubIds = {}
			client = mqtt.connect({
				port: ports.PORTAND47,
				host: 'localhost',
				connectTimeout: 350,
				reconnectPeriod: 300,
			})

			const server2 = net
				.createServer((stream) => {
					const serverClient = new Connection(stream)
					serverClient.on('error', () => {})
					serverClient.on('connect', (packet) => {
						if (packet.clientId === 'invalid') {
							serverClient.connack({ returnCode: 2 })
						} else {
							serverClient.connack({ returnCode: 0 })
						}
					})

					server2.emit('client', serverClient)
				})
				.listen(ports.PORTAND47)

			server2.on('client', (serverClient) => {
				client.publish('topic', 'data', { qos: 1 }, () => {
					client.end(true, (err1) => {
						server2.close((err2) => {
							done(err1 || err2)
						})
					})
				})

				serverClient.on('publish', function onPublish(packet) {
					if (killedConnections < KILL_COUNT) {
						// Kill the first few pub attempts to simulate a flaky connection
						killedConnections++
						serverClient.destroy()

						// to avoid receiving inflight messages
						serverClient.removeListener('publish', onPublish)
					} else {
						// Keep track of acks
						if (!pubIds[packet.messageId]) {
							pubIds[packet.messageId] = 0
						}

						pubIds[packet.messageId]++

						if (pubIds[packet.messageId] > 1) {
							done(
								new Error(
									`Multiple duplicate acked publishes received for messageId ${packet.messageId}`,
								),
							)
							client.end(true)
							serverClient.destroy()
							server2.close()
						}

						serverClient.puback(packet)
					}
				})
			})
		})
	})

	it('check emit error on checkDisconnection w/o callback', function test(done) {
		this.timeout(15000)

		const server2 = new MqttServer((c) => {
			c.on('connect', (packet) => {
				c.connack({
					reasonCode: 0,
				})
			})
			c.on('publish', (packet) => {
				setImmediate(() => {
					packet.reasonCode = 0
					c.puback(packet)
				})
			})
		}).listen(ports.PORTAND118)

		const opts: IClientOptions = {
			host: 'localhost',
			port: ports.PORTAND118,
			protocolVersion: 5,
		}
		client = mqtt.connect(opts)

		// wait for the client to receive an error...
		client.on('error', (error) => {
			assert.equal(error.message, 'client disconnecting')
			server2.close((err) => done(err))
		})
		client.on('connect', () => {
			client.end(() => {
				client['_checkDisconnecting']()
			})
		})
	})

	describe('async methods', () => {
		it('connect-subscribe-unsubscribe-end', function test() {
			this.timeout(5000)

			// eslint-disable-next-line no-async-promise-executor
			return new Promise<void>(async (resolve, reject) => {
				server.once('client', (serverClient) => {
					serverClient.on('publish', async (packet) => {
						assert.equal(packet.topic, 'hello')
						assert.equal(packet.payload.toString(), 'world')
						await client.unsubscribeAsync('hello')
						await client.endAsync()
						resolve()
					})
				})

				client = await mqtt.connectAsync(config)

				const sub = await client.subscribeAsync('hello')

				assert.equal(sub[0].topic, 'hello')
				assert.equal(sub[0].qos, 0)

				await client.publishAsync('hello', 'world')
			})
		})

		it('connect should throw error', async function test() {
			this.timeout(5000)
			let error = false

			try {
				await mqtt.connectAsync({
					port: 1000,
					host: '127.0.0.1',
				})
			} catch (err) {
				error = true
				assert.isTrue(err.message.includes('ECONNREFUSED'))
			}

			assert.isTrue(error)
		})

		it('publish should throw error', async function test() {
			this.timeout(5000)
			let error = false

			try {
				client = await mqtt.connectAsync(config)
				client.disconnecting = true
				await client.publishAsync('#/#', 'world')
			} catch (err) {
				error = true
				assert.equal(err.message, 'client disconnecting')
			}

			assert.isTrue(error)
		})
	})
})
