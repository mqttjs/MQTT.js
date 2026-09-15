import { assert } from 'chai'
import { after, describe, it } from 'node:test'
import abstractClientTests from './abstract_client'
import { MqttServer } from './server'
import serverBuilder from './server_helpers_for_client_tests'
import getPorts from './helpers/port_list'
import mqtt, { type ErrorWithReasonCode } from '../../src'

const ports = getPorts(1)

describe('MQTT 5.0', () => {
	const server = serverBuilder('mqtt').listen(ports.PORTAND115)
	const config = {
		protocol: 'mqtt',
		port: ports.PORTAND115,
		protocolVersion: 5,
		properties: { maximumPacketSize: 200 },
	}

	after(() => {
		// clean up and make sure the server is no longer listening...
		if (server.listening) {
			server.close()
		}

		process.exit(0)
	})

	abstractClientTests(server, config, ports)

	it(
		'topic should be complemented on receive',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				properties: {
					topicAliasMaximum: 3,
				},
			}
			const client = mqtt.connect(opts)
			let publishCount = 0
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					assert.strictEqual(packet.properties.topicAliasMaximum, 3)
					serverClient.connack({
						reasonCode: 0,
					})
					// register topicAlias
					serverClient.publish({
						messageId: 0,
						topic: 'test1',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 1 },
					})
					// use topicAlias
					serverClient.publish({
						messageId: 0,
						topic: '',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 1 },
					})
					// overwrite registered topicAlias
					serverClient.publish({
						messageId: 0,
						topic: 'test2',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 1 },
					})
					// use topicAlias
					serverClient.publish({
						messageId: 0,
						topic: '',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 1 },
					})
				})
			}).listen(ports.PORTAND103)

			client.on('message', (topic, messagee, packet) => {
				switch (publishCount++) {
					case 0:
						assert.strictEqual(topic, 'test1')
						assert.strictEqual(packet.topic, 'test1')
						assert.strictEqual(packet.properties.topicAlias, 1)
						break
					case 1:
						assert.strictEqual(topic, 'test1')
						assert.strictEqual(packet.topic, '')
						assert.strictEqual(packet.properties.topicAlias, 1)
						break
					case 2:
						assert.strictEqual(topic, 'test2')
						assert.strictEqual(packet.topic, 'test2')
						assert.strictEqual(packet.properties.topicAlias, 1)
						break
					case 3:
						assert.strictEqual(topic, 'test2')
						assert.strictEqual(packet.topic, '')
						assert.strictEqual(packet.properties.topicAlias, 1)
						client.end(true, (err1) => {
							server2.close((err2) => {
								done(err1 || err2)
							})
						})
						break
				}
			})
		},
	)

	it(
		'registered topic alias should automatically used if autoUseTopicAlias is true',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				autoUseTopicAlias: true,
			}
			const client = mqtt.connect(opts)

			let publishCount = 0
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						properties: {
							topicAliasMaximum: 3,
						},
					})
				})
				serverClient.on('publish', (packet) => {
					switch (publishCount++) {
						case 0:
							assert.strictEqual(packet.topic, 'test1')
							assert.strictEqual(packet.properties.topicAlias, 1)
							break
						case 1:
							assert.strictEqual(packet.topic, '')
							assert.strictEqual(packet.properties.topicAlias, 1)
							break
						case 2:
							assert.strictEqual(packet.topic, '')
							assert.strictEqual(packet.properties.topicAlias, 1)
							client.end(true, (err1) => {
								server2.close((err2) => {
									done(err1 || err2)
								})
							})
							break
					}
				})
			}).listen(ports.PORTAND103)

			client.on('connect', () => {
				// register topicAlias
				client.publish('test1', 'Message', {
					properties: { topicAlias: 1 },
				})
				// use topicAlias
				client.publish('', 'Message', { properties: { topicAlias: 1 } })
				// use topicAlias by autoApplyTopicAlias
				client.publish('test1', 'Message')
			})
		},
	)

	it(
		'topicAlias is automatically used if autoAssignTopicAlias is true',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				autoAssignTopicAlias: true,
			}
			const client = mqtt.connect(opts)

			let publishCount = 0
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						properties: {
							topicAliasMaximum: 3,
						},
					})
				})
				serverClient.on('publish', (packet) => {
					switch (publishCount++) {
						case 0:
							assert.strictEqual(packet.topic, 'test1')
							assert.strictEqual(packet.properties.topicAlias, 1)
							break
						case 1:
							assert.strictEqual(packet.topic, 'test2')
							assert.strictEqual(packet.properties.topicAlias, 2)
							break
						case 2:
							assert.strictEqual(packet.topic, 'test3')
							assert.strictEqual(packet.properties.topicAlias, 3)
							break
						case 3:
							assert.strictEqual(packet.topic, '')
							assert.strictEqual(packet.properties.topicAlias, 1)
							break
						case 4:
							assert.strictEqual(packet.topic, '')
							assert.strictEqual(packet.properties.topicAlias, 3)
							break
						case 5:
							assert.strictEqual(packet.topic, 'test4')
							assert.strictEqual(packet.properties.topicAlias, 2)
							client.end(true, (err1) => {
								server2.close((err2) => {
									done(err1 || err2)
								})
							})
							break
					}
				})
			}).listen(ports.PORTAND103)

			client.on('connect', () => {
				// register topicAlias
				client.publish('test1', 'Message')
				client.publish('test2', 'Message')
				client.publish('test3', 'Message')

				// use topicAlias
				client.publish('test1', 'Message')
				client.publish('test3', 'Message')

				// renew LRU topicAlias
				client.publish('test4', 'Message')
			})
		},
	)

	it(
		'topicAlias should be removed and topic restored on resend',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const incomingStore = new mqtt.Store({ clean: false })
			const outgoingStore = new mqtt.Store({ clean: false })
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				clientId: 'cid1',
				incomingStore,
				outgoingStore,
				clean: false,
				reconnectPeriod: 100,
			}
			const client = mqtt.connect(opts)

			let connectCount = 0
			let publishCount = 0
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					switch (connectCount++) {
						case 0:
							serverClient.connack({
								reasonCode: 0,
								sessionPresent: false,
								properties: {
									topicAliasMaximum: 3,
								},
							})
							break
						case 1:
							serverClient.connack({
								reasonCode: 0,
								sessionPresent: true,
								properties: {
									topicAliasMaximum: 3,
								},
							})
							break
					}
				})
				serverClient.on('publish', (packet) => {
					switch (publishCount++) {
						case 0:
							assert.strictEqual(packet.topic, 'test1')
							assert.strictEqual(packet.properties.topicAlias, 1)
							break
						case 1:
							assert.strictEqual(packet.topic, '')
							assert.strictEqual(packet.properties.topicAlias, 1)
							setImmediate(() => {
								serverClient.stream.destroy()
							})
							break
						case 2: {
							assert.strictEqual(packet.topic, 'test1')
							let alias1
							if (packet.properties) {
								alias1 = packet.properties.topicAlias
							}
							assert.strictEqual(alias1, undefined)
							serverClient.puback({ messageId: packet.messageId })
							break
						}
						case 3: {
							assert.strictEqual(packet.topic, 'test1')
							let alias2
							if (packet.properties) {
								alias2 = packet.properties.topicAlias
							}
							assert.strictEqual(alias2, undefined)
							serverClient.puback({ messageId: packet.messageId })
							client.end(true, (err1) => {
								server2.close((err2) => {
									done(err1 || err2)
								})
							})
							break
						}
					}
				})
			}).listen(ports.PORTAND103)

			client.once('connect', () => {
				// register topicAlias
				client.publish('test1', 'Message', {
					qos: 1,
					properties: { topicAlias: 1 },
				})
				// use topicAlias
				client.publish('', 'Message', {
					qos: 1,
					properties: { topicAlias: 1 },
				})
			})
		},
	)

	it(
		'topicAlias should be removed and topic restored on offline publish',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const incomingStore = new mqtt.Store({ clean: false })
			const outgoingStore = new mqtt.Store({ clean: false })
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				clientId: 'cid1',
				incomingStore,
				outgoingStore,
				clean: false,
				reconnectPeriod: 100,
			}
			const client = mqtt.connect(opts)

			let connectCount = 0
			let publishCount = 0
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					switch (connectCount++) {
						case 0:
							serverClient.connack({
								reasonCode: 0,
								sessionPresent: false,
								properties: {
									topicAliasMaximum: 3,
								},
							})
							setImmediate(() => {
								serverClient.stream.destroy()
							})
							break
						case 1:
							serverClient.connack({
								reasonCode: 0,
								sessionPresent: true,
								properties: {
									topicAliasMaximum: 3,
								},
							})
							break
					}
				})
				serverClient.on('publish', (packet) => {
					switch (publishCount++) {
						case 0: {
							assert.strictEqual(packet.topic, 'test1')
							let alias1
							if (packet.properties) {
								alias1 = packet.properties.topicAlias
							}
							assert.strictEqual(alias1, undefined)
							assert.strictEqual(packet.qos, 1)
							serverClient.puback({ messageId: packet.messageId })
							break
						}
						case 1: {
							assert.strictEqual(packet.topic, 'test1')
							let alias2
							if (packet.properties) {
								alias2 = packet.properties.topicAlias
							}
							assert.strictEqual(alias2, undefined)
							assert.strictEqual(packet.qos, 0)
							break
						}
						case 2: {
							assert.strictEqual(packet.topic, 'test1')
							let alias3
							if (packet.properties) {
								alias3 = packet.properties.topicAlias
							}
							assert.strictEqual(alias3, undefined)
							assert.strictEqual(packet.qos, 0)
							client.end(true, (err1) => {
								server2.close((err2) => {
									done(err1 || err2)
								})
							})
							break
						}
					}
				})
			}).listen(ports.PORTAND103)

			client.once('close', () => {
				// register topicAlias
				client.publish('test1', 'Message', {
					qos: 0,
					properties: { topicAlias: 1 },
				})
				// use topicAlias
				client.publish('', 'Message', {
					qos: 0,
					properties: { topicAlias: 1 },
				})
				client.publish('', 'Message', {
					qos: 1,
					properties: { topicAlias: 1 },
				})
			})
		},
	)

	it(
		'should error cb call if PUBLISH out of range topicAlias',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
			}
			const client = mqtt.connect(opts)
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						sessionPresent: false,
						properties: {
							topicAliasMaximum: 3,
						},
					})
				})
			}).listen(ports.PORTAND103)

			client.on('connect', () => {
				// register topicAlias
				client.publish(
					'test1',
					'Message',
					{ properties: { topicAlias: 4 } },
					(error) => {
						assert.strictEqual(
							error.message,
							'Sending Topic Alias out of range',
						)
						client.end(true, (err1) => {
							server2.close((err2) => {
								done(err1 || err2)
							})
						})
					},
				)
			})
		},
	)

	it(
		'should error cb call if PUBLISH out of range topicAlias on topicAlias disabled by broker',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
			}
			const client = mqtt.connect(opts)
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						sessionPresent: false,
					})
				})
			}).listen(ports.PORTAND103)

			client.on('connect', () => {
				// register topicAlias
				client.publish(
					'test1',
					'Message',
					{ properties: { topicAlias: 1 } },
					(error) => {
						assert.strictEqual(
							error.message,
							'Sending Topic Alias out of range',
						)
						client.end(true, (err1) => {
							server2.close((err2) => {
								done(err1 || err2)
							})
						})
					},
				)
			})
		},
	)

	it(
		'should throw an error if broker PUBLISH out of range topicAlias',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				properties: {
					topicAliasMaximum: 3,
				},
			}
			const client = mqtt.connect(opts)
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						sessionPresent: false,
					})
					// register out of range topicAlias
					serverClient.publish({
						messageId: 0,
						topic: 'test1',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 4 },
					})
				})
			}).listen(ports.PORTAND103)

			client.on('error', (error) => {
				assert.strictEqual(
					error.message,
					'Received Topic Alias 4 is outside the advertised Topic Alias Maximum range 1-3',
				)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err1 || err2)
					})
				})
			})
		},
	)

	it(
		'should throw an error if broker PUBLISH topicAlias:0',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				properties: {
					topicAliasMaximum: 3,
				},
			}
			const client = mqtt.connect(opts)
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						sessionPresent: false,
					})
					// register out of range topicAlias
					serverClient.publish({
						messageId: 0,
						topic: 'test1',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 0 },
					})
				})
			}).listen(ports.PORTAND103)

			client.on('error', (error) => {
				assert.strictEqual(
					error.message,
					'Received Topic Alias 0 is outside the advertised Topic Alias Maximum range 1-3',
				)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err1 || err2)
					})
				})
			})
		},
	)

	it(
		'should throw an error if broker PUBLISH unregistered topicAlias',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				properties: {
					topicAliasMaximum: 3,
				},
			}
			const client = mqtt.connect(opts)
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						sessionPresent: false,
					})
					// register out of range topicAlias
					serverClient.publish({
						messageId: 0,
						topic: '', // use topic alias
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 1 }, // in range topic alias
					})
				})
			}).listen(ports.PORTAND103)

			client.on('error', (error) => {
				assert.strictEqual(
					error.message,
					'Received unregistered Topic Alias',
				)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err1 || err2)
					})
				})
			})
		},
	)

	// Regression test for GHSA-c8jq-r765-cq7g: a broker sending a Topic Alias to
	// a client that never advertised a Topic Alias Maximum used to dereference an
	// uninitialized receiver and crash the process with an uncaught TypeError.
	// The guard must tear the connection down and let it reconnect: returning
	// without calling the packet pump callback leaves the client wedged
	// (`connected === true`, no packets, no `close`), and ending the client would
	// hand the broker a permanent kill switch.
	it(
		'should tear down and reconnect when the broker sends an unsolicited topic alias',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND103,
				protocolVersion: 5,
				reconnectPeriod: 100,
				// deliberately no properties.topicAliasMaximum, so the client
				// does not initialize its topic alias receiver
			}
			const client = mqtt.connect(opts)

			let finished = false
			let deadline: NodeJS.Timeout

			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err || err1 || err2)
					})
				})
			}

			// assertions run inside event handlers, route failures to `done`
			// instead of letting them escape the test's stack
			const check = (fn: () => void) => {
				try {
					fn()
				} catch (assertErr) {
					finish(assertErr as Error)
				}
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// broker sends a topic alias the client never allowed
					serverClient.publish({
						messageId: 0,
						topic: 'test',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 1 },
					})
				})
			}).listen(ports.PORTAND103)

			let errors = 0
			let closes = 0
			let connects = 0

			// Without a deadline the only way to fail is the 15s test timeout,
			// which says nothing about what broke. Each stage arms the one for
			// the stage that follows it, and the message names the regression
			// plus the counters that prove it.
			const armDeadline = (ms: number, regression: string) => {
				clearTimeout(deadline)
				deadline = setTimeout(() => {
					finish(
						new Error(
							`${regression} (errors: ${errors}, closes: ${closes}, connects: ${connects})`,
						),
					)
				}, ms)
			}

			client.on('error', (err) => {
				errors++
				check(() => {
					assert.strictEqual(
						err.message,
						'Received a PUBLISH Topic Alias but no Topic Alias Maximum was advertised',
					)
					assert.strictEqual((err as ErrorWithReasonCode).code, 148)
				})
			})

			client.on('close', () => {
				closes++
				if (closes === 1) {
					armDeadline(
						2000,
						'the connection was torn down but never reconnected',
					)
				}
			})

			client.on('connect', () => {
				connects++
				if (connects < 2) {
					armDeadline(
						3000,
						'the unsolicited topic alias never tore the connection down: the client is wedged',
					)
					return
				}
				// the first connection was torn down by the guard and the
				// client came back on its own: not wedged, not terminal
				check(() => {
					assert.isAtLeast(errors, 1, 'expected a protocol error')
					assert.isAtLeast(closes, 1, 'expected the socket to close')
					assert.isFalse(client.disconnecting)
				})
				finish()
			})

			// PORTAND103 is shared with ~20 other tests in this file: if the
			// guard ever regresses to "wedged" this test times out, and without
			// this the leaked listener makes all of them fail with EADDRINUSE
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	// Also GHSA-c8jq-r765-cq7g: `_write` parses the whole TCP chunk into the
	// pump queue before the first packet is handled, so a teardown that only
	// called the pump callback kept running the rest of the attacker's chunk
	// against a destroyed stream.
	it(
		'should drop the rest of the chunk after a topic alias teardown',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND114,
				protocolVersion: 5,
				// one connection only: everything asserted here is about the
				// packets that follow the bad one in the same chunk
				reconnectPeriod: 0,
				// deliberately no properties.topicAliasMaximum
			})

			let finished = false

			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err || err1 || err2)
					})
				})
			}

			const errors: Error[] = []
			const messages: string[] = []

			// the signal below only arrives if the teardown happened at all; a
			// regression to the original wedge would otherwise hang until the
			// test timeout with nothing said about why
			const deadline = setTimeout(() => {
				finish(
					new Error(
						`the connection was never torn down (errors: ${errors.length}, messages: ${messages.length})`,
					),
				)
			}, 2000)

			const server2 = new MqttServer((serverClient) => {
				// The client's teardown destroys its socket, and the FIN
				// arriving here is strictly later than anything the pump could
				// still do with the rest of the chunk: a leaked `message` is
				// emitted from the nextTick queue, which drains in full before
				// the event loop ever polls I/O. So this is the deterministic
				// "the pump has had its chance" signal, in place of a sleep.
				serverClient.on('close', () => {
					try {
						assert.deepStrictEqual(
							messages,
							[],
							'no message may be emitted after the teardown',
						)
						assert.strictEqual(
							errors.length,
							1,
							`expected exactly one error, got ${errors
								.map((e) => e.message)
								.join(', ')}`,
						)
					} catch (assertErr) {
						return finish(assertErr as Error)
					}
					finish()
				})

				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// written back to back so they reach the client as one
					// chunk: the bad one tears the connection down, the good
					// one must never be handled
					serverClient.publish({
						messageId: 0,
						topic: 'test',
						payload: 'Message',
						qos: 0,
						properties: { topicAlias: 1 },
					})
					serverClient.publish({
						messageId: 0,
						topic: 'after-teardown',
						payload: 'Message',
						qos: 0,
					})
				})
			}).listen(ports.PORTAND114)

			client.on('error', (err) => errors.push(err))
			client.on('message', (topic) => messages.push(topic))

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should throw an error if there is Auth Data with no Auth Method',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND115,
				protocolVersion: 5,
				properties: { authenticationData: Buffer.from([1, 2, 3, 4]) },
			}
			const client = mqtt.connect(opts)
			client.on('error', (error) => {
				assert.strictEqual(
					error.message,
					'Packet has no Authentication Method',
				)
				// client will not be connected, so we will call done.
				assert.isTrue(
					client.disconnected,
					'validate client is disconnected',
				)
				client.end(true, done)
			})
		},
	)

	it(
		'auth packet',
		{
			timeout: 2500,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND115,
				protocolVersion: 5,
				properties: { authenticationMethod: 'json' },
				authPacket: {},
				manualConnect: true,
			}
			let authSent = false

			const client = mqtt.connect(opts)
			server.once('client', (c) => {
				// this test is flaky, there is a race condition
				// that could make the test fail as the auth packet
				// is sent by the client even before connack so it could arrive before
				// the clientServer is listening for the auth packet. To avoid this
				// if the event is not emitted we simply check if
				// the auth packet is sent after 1 second.
				let closeTimeout = setTimeout(() => {
					assert.isTrue(authSent)
					closeTimeout = null
					client.end(true, done)
				}, 1000)

				c.on('auth', (packet) => {
					if (closeTimeout) {
						clearTimeout(closeTimeout)
						client.end(done)
					}
				})
			})
			client.on('packetsend', (packet) => {
				if (packet.cmd === 'auth') {
					authSent = true
				}
			})

			client.connect()
		},
	)

	it(
		'Maximum Packet Size',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND115,
				protocolVersion: 5,
				properties: { maximumPacketSize: 1 },
			}
			const client = mqtt.connect(opts)
			client.on('error', (error) => {
				assert.strictEqual(
					error.message,
					'exceeding packets size connack',
				)
				client.end(true, done)
			})
		},
	)

	it(
		'Change values of some properties by server response',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						properties: {
							serverKeepAlive: 16,
							maximumPacketSize: 95,
						},
					})
				})
			}).listen(ports.PORTAND116)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND116,
				protocolVersion: 5,
				properties: {
					topicAliasMaximum: 10,
					// serverKeepAlive: 11,
					maximumPacketSize: 100,
				},
			}
			const client = mqtt.connect(opts)
			client.on('connect', () => {
				assert.strictEqual(client.options.keepalive, 16)
				assert.strictEqual(
					client.options.properties.maximumPacketSize,
					95,
				)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err1 || err2)
					})
				})
			})
		},
	)

	it(
		'should resubscribe when reconnecting with protocolVersion 5 and Session Present flag is false',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			let tryReconnect = true
			let reconnectEvent = false
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						sessionPresent: false,
					})
					serverClient.on('subscribe', () => {
						if (!tryReconnect) {
							client.end(true, (err1) => {
								server2.close((err2) => {
									done(err1 || err2)
								})
							})
						}
					})
				})
			}).listen(ports.PORTAND316)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND316,
				protocolVersion: 5,
			}
			const client = mqtt.connect(opts)

			client.on('reconnect', () => {
				reconnectEvent = true
			})

			client.on('connect', (connack) => {
				assert.isFalse(connack.sessionPresent)
				if (tryReconnect) {
					client.subscribe('hello', () => {
						client.stream.end()
					})

					tryReconnect = false
				} else {
					assert.isTrue(reconnectEvent)
				}
			})
		},
	)

	it(
		'should resubscribe when reconnecting with protocolVersion 5 and properties',
		{
			// timeout: 15000,
		},
		function _test(t, done) {
			// this.timeout(15000)
			let tryReconnect = true
			let reconnectEvent = false
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
						sessionPresent: false,
					})
				})
				serverClient.on('subscribe', (packet) => {
					if (!reconnectEvent) {
						serverClient.suback({
							messageId: packet.messageId,
							granted: packet.subscriptions.map((e) => e.qos),
						})
					} else if (!tryReconnect) {
						assert.strictEqual(
							packet.properties.userProperties.test,
							'test',
						)
						client.end(true, (err1) => {
							server2.close((err2) => {
								done(err1 || err2)
							})
						})
					}
				})
			}).listen(ports.PORTAND326)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND326,
				protocolVersion: 5,
			}
			const client = mqtt.connect(opts)

			client.on('reconnect', () => {
				reconnectEvent = true
			})

			client.on('connect', (connack) => {
				assert.isFalse(connack.sessionPresent)
				if (tryReconnect) {
					client.subscribe(
						'hello',
						{ properties: { userProperties: { test: 'test' } } },
						() => {
							client.stream.end()
						},
					)

					tryReconnect = false
				} else {
					assert.isTrue(reconnectEvent)
				}
			})
		},
	)

	const serverThatSendsErrors = new MqttServer((serverClient) => {
		serverClient.on('connect', (packet) => {
			serverClient.connack({
				reasonCode: 0,
			})
		})
		serverClient.on('publish', (packet) => {
			setImmediate(() => {
				switch (packet.qos) {
					case 0:
						break
					case 1:
						packet.reasonCode = 142
						delete packet.cmd
						serverClient.puback(packet)
						break
					case 2:
						packet.reasonCode = 142
						delete packet.cmd
						serverClient.pubrec(packet)
						break
				}
			})
		})

		serverClient.on('pubrel', (packet) => {
			packet.reasonCode = 142
			delete packet.cmd
			serverClient.pubcomp(packet)
		})
	})

	it(
		'Subscribe properties',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND119,
				protocolVersion: 5,
			}
			const subOptions = { properties: { subscriptionIdentifier: 1234 } }
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
					})
				})
				serverClient.on('subscribe', (packet) => {
					assert.strictEqual(
						packet.properties.subscriptionIdentifier,
						subOptions.properties.subscriptionIdentifier,
					)
					client.end(true, (err1) => {
						server2.close((err2) => {
							done(err1 || err2)
						})
					})
				})
			}).listen(ports.PORTAND119)

			const client = mqtt.connect(opts)
			client.on('connect', () => {
				client.subscribe('a/b', subOptions)
			})
		},
	)

	it(
		'puback handling errors check',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			serverThatSendsErrors.listen(ports.PORTAND117)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND117,
				protocolVersion: 5,
			}
			const client = mqtt.connect(opts)
			client.once('connect', () => {
				client.publish(
					'a/b',
					'message',
					{ qos: 1 },
					(err: ErrorWithReasonCode) => {
						assert.strictEqual(
							err.message,
							'Publish error: Session taken over',
						)
						assert.strictEqual(err.code, 142)
					},
				)
				client.end(true, (err1) => {
					serverThatSendsErrors.close((err2) => {
						done(err1 || err2)
					})
				})
			})
		},
	)

	it(
		'pubrec handling errors check',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			serverThatSendsErrors.listen(ports.PORTAND118)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND118,
				protocolVersion: 5,
			}
			const client = mqtt.connect(opts)
			client.once('connect', () => {
				client.publish(
					'a/b',
					'message',
					{ qos: 2 },
					(err: ErrorWithReasonCode) => {
						assert.strictEqual(
							err.message,
							'Publish error: Session taken over',
						)
						assert.strictEqual(err.code, 142)
					},
				)
				client.end(true, (err1) => {
					serverThatSendsErrors.close((err2) => {
						done(err1 || err2)
					})
				})
			})
		},
	)

	// Also GHSA-c8jq-r765-cq7g, reached through the application instead of the
	// broker: a `customHandleAcks` that reports an error used to `return
	// client.emit('error', …)` without calling the pump callback, so the pending
	// `_write` was never completed and every packet after it was stranded on a
	// connection that is still live.
	it(
		'should keep processing packets after customHandleAcks reports an error',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			let finished = false

			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err || err1 || err2)
					})
				})
			}

			const messages: string[] = []
			const errors: string[] = []

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// back to back, so the second one is already sitting in the
					// pump queue when the first one errors
					serverClient.publish({
						topic: 'acks/bad',
						payload: 'payload',
						qos: 1,
						messageId: 1,
					})
					serverClient.publish({
						topic: 'acks/good',
						payload: 'payload',
						qos: 1,
						messageId: 2,
					})
				})

				// the PUBACK for the second message is the proof, and a
				// deterministic one: only a pump that resumed after the error,
				// on a connection the error did not tear down, can write it
				serverClient.on('puback', (packet) => {
					try {
						assert.strictEqual(packet.messageId, 2)
						assert.deepStrictEqual(messages, ['acks/good'])
						assert.deepStrictEqual(errors, ['handler said no'])
					} catch (assertErr) {
						return finish(assertErr as Error)
					}
					finish()
				})
			}).listen(ports.PORTAND316)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND316,
				protocolVersion: 5,
				reconnectPeriod: 0,
				customHandleAcks(topic, message, packet, cb) {
					if (topic === 'acks/bad') {
						cb(new Error('handler said no'))
						return
					}
					cb(0)
				},
			})

			client.on('error', (err) => errors.push(err.message))
			client.on('message', (topic) => messages.push(topic))

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	// A `customHandleAcks` that calls its callback twice is an application bug,
	// but it must not take the client down with it. Before the pump callback
	// was null checked the second call reached `nextTickWork` with the pending
	// `_write` already completed and threw `done is not a function` from inside
	// the packet pump - an uncaught exception, so the whole process died.
	it(
		'should survive a customHandleAcks that calls its callback twice',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			let finished = false

			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err || err1 || err2)
					})
				})
			}

			const messages: string[] = []
			const errors: string[] = []

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					serverClient.publish({
						topic: 'acks/twice',
						payload: 'payload',
						qos: 1,
						messageId: 1,
					})
				})

				serverClient.on('puback', (packet) => {
					if (packet.messageId === 1) {
						// the pump survived the double callback; now prove it is
						// still live by pushing a second packet through it, in a
						// write of its own
						serverClient.publish({
							topic: 'acks/after',
							payload: 'payload',
							qos: 1,
							messageId: 2,
						})
						return
					}

					try {
						assert.strictEqual(packet.messageId, 2)
						assert.deepStrictEqual(messages, [
							'acks/twice',
							'acks/after',
						])
						assert.deepStrictEqual(errors, [
							'handler called cb twice',
						])
					} catch (assertErr) {
						return finish(assertErr as Error)
					}
					finish()
				})
			}).listen(ports.PORTAND343)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND343,
				protocolVersion: 5,
				reconnectPeriod: 0,
				customHandleAcks(topic, message, packet, cb) {
					if (topic === 'acks/twice') {
						// deliberately missing the `return` an application
						// should have written
						cb(new Error('handler called cb twice'))
					}
					cb(0)
				},
			})

			client.on('error', (err) => errors.push(err.message))
			client.on('message', (topic) => messages.push(topic))

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'puback handling custom reason code',
		{
			// timeout: 15000,
		},
		function _test(t, done) {
			// this.timeout(15000)
			serverThatSendsErrors.listen(ports.PORTAND117)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND117,
				protocolVersion: 5,
				customHandleAcks(topic, message, packet, cb) {
					let code = 0
					if (topic === 'a/b') {
						code = 128
					}
					cb(code)
				},
			}

			serverThatSendsErrors.once('client', (serverClient) => {
				serverClient.once('subscribe', () => {
					serverClient.publish({
						topic: 'a/b',
						payload: 'payload',
						qos: 1,
						messageId: 1,
					})
				})

				serverClient.on('puback', (packet) => {
					assert.strictEqual(packet.reasonCode, 128)
					client.end(true, (err1) => {
						serverThatSendsErrors.close((err2) => {
							done(err1 || err2)
						})
					})
				})
			})

			const client = mqtt.connect(opts)
			client.once('connect', () => {
				client.subscribe('a/b', { qos: 1 })
			})
		},
	)

	it('suback handling error codes', function _test(t, done) {
		serverThatSendsErrors.listen(ports.PORTAND117)

		serverThatSendsErrors.once('client', (serverClient) => {
			serverClient.on('subscribe', (packet) => {
				serverClient.suback({
					messageId: packet.messageId,
					granted: packet.subscriptions.map((e) => 135),
				})
			})
		})

		const client = mqtt.connect({
			protocolVersion: 5,
			port: ports.PORTAND117,
			host: 'localhost',
		})

		client.subscribe('$SYS/#', (subErr) => {
			client.end(true, (endErr) => {
				serverThatSendsErrors.close((err2) => {
					if (subErr) {
						assert.strictEqual(
							subErr.message,
							'Subscribe error: Not authorized',
						)
						return done(err2 || endErr)
					}
					done(new Error('Suback errors do NOT work'))
				})
			})
		})
	})

	it(
		'server side disconnect',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', (packet) => {
					serverClient.connack({
						reasonCode: 0,
					})
					serverClient.disconnect({ reasonCode: 128 })
					server2.close()
				})
			})
			server2.listen(ports.PORTAND327)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND327,
				protocolVersion: 5,
			}

			const client = mqtt.connect(opts)
			client.once(
				'disconnect',
				(disconnectPacket: mqtt.IDisconnectPacket) => {
					assert.strictEqual(disconnectPacket.reasonCode, 128)
					client.end(true, (err) => done(err))
				},
			)
		},
	)

	it(
		'pubrec handling custom reason code',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			serverThatSendsErrors.listen(ports.PORTAND117)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND117,
				protocolVersion: 5,
				customHandleAcks(topic, message, packet, cb) {
					let code = 0
					if (topic === 'a/b') {
						code = 128
					}
					cb(code)
				},
			}
			const client = mqtt.connect(opts)
			client.once('connect', () => {
				client.subscribe('a/b', { qos: 1 })
			})

			serverThatSendsErrors.once('client', (serverClient) => {
				serverClient.once('subscribe', () => {
					serverClient.publish({
						topic: 'a/b',
						payload: 'payload',
						qos: 2,
						messageId: 1,
					})
				})

				serverClient.on('pubrec', (packet) => {
					assert.strictEqual(packet.reasonCode, 128)
					client.end(true, (err1) => {
						serverThatSendsErrors.close((err2) => {
							done(err1 || err2)
						})
					})
				})
			})
		},
	)

	it(
		'puback handling custom reason code with error',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			serverThatSendsErrors.listen(ports.PORTAND117)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND117,
				protocolVersion: 5,
				customHandleAcks(topic, message, packet, cb) {
					const code = 0
					if (topic === 'a/b') {
						cb(new Error('a/b is not valid'))
						return
					}
					cb(code)
				},
			}

			serverThatSendsErrors.once('client', (serverClient) => {
				serverClient.once('subscribe', () => {
					serverClient.publish({
						topic: 'a/b',
						payload: 'payload',
						qos: 1,
						messageId: 1,
					})
				})
			})

			const client = mqtt.connect(opts)
			client.on('error', (error) => {
				assert.strictEqual(error.message, 'a/b is not valid')
				client.end(true, (err1) => {
					serverThatSendsErrors.close((err2) => {
						done(err1 || err2)
					})
				})
			})
			client.once('connect', () => {
				client.subscribe('a/b', { qos: 1 })
			})
		},
	)

	it(
		'pubrec handling custom reason code with error',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			serverThatSendsErrors.listen(ports.PORTAND117)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND117,
				protocolVersion: 5,
				customHandleAcks(topic, message, packet, cb) {
					const code = 0
					if (topic === 'a/b') {
						cb(new Error('a/b is not valid'))
						return
					}
					cb(code)
				},
			}

			serverThatSendsErrors.once('client', (serverClient) => {
				serverClient.once('subscribe', () => {
					serverClient.publish({
						topic: 'a/b',
						payload: 'payload',
						qos: 2,
						messageId: 1,
					})
				})
			})

			const client = mqtt.connect(opts)
			client.on('error', (error) => {
				assert.strictEqual(error.message, 'a/b is not valid')
				client.end(true, (err1) => {
					serverThatSendsErrors.close((err2) => {
						done(err1 || err2)
					})
				})
			})
			client.once('connect', () => {
				client.subscribe('a/b', { qos: 1 })
			})
		},
	)

	it(
		'puback handling custom invalid reason code',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			serverThatSendsErrors.listen(ports.PORTAND117)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND117,
				protocolVersion: 5,
				customHandleAcks(topic, message, packet, cb) {
					let code = 0
					if (topic === 'a/b') {
						code = 124124
					}
					cb(code)
				},
			}

			serverThatSendsErrors.once('client', (serverClient) => {
				serverClient.once('subscribe', () => {
					serverClient.publish({
						topic: 'a/b',
						payload: 'payload',
						qos: 1,
						messageId: 1,
					})
				})
			})

			const client = mqtt.connect(opts)
			client.on('error', (error) => {
				assert.strictEqual(
					error.message,
					'Wrong reason code for puback',
				)
				client.end(true, (err1) => {
					serverThatSendsErrors.close((err2) => {
						done(err1 || err2)
					})
				})
			})
			client.once('connect', () => {
				client.subscribe('a/b', { qos: 1 })
			})
		},
	)

	it(
		'pubrec handling custom invalid reason code',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			serverThatSendsErrors.listen(ports.PORTAND117)
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND117,
				protocolVersion: 5,
				customHandleAcks(topic, message, packet, cb) {
					let code = 0
					if (topic === 'a/b') {
						code = 34535
					}
					cb(code)
				},
			}

			serverThatSendsErrors.once('client', (serverClient) => {
				serverClient.once('subscribe', () => {
					serverClient.publish({
						topic: 'a/b',
						payload: 'payload',
						qos: 2,
						messageId: 1,
					})
				})
			})

			const client = mqtt.connect(opts)
			client.on('error', (error) => {
				assert.strictEqual(
					error.message,
					'Wrong reason code for pubrec',
				)
				client.end(true, (err1) => {
					serverThatSendsErrors.close((err2) => {
						done(err1 || err2)
					})
				})
			})
			client.once('connect', () => {
				client.subscribe('a/b', { qos: 1 })
			})
		},
	)
})
