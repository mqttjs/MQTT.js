import { assert } from 'chai'
import { after, describe, it } from 'node:test'
import abstractClientTests from './abstract_client'
import { MqttServer } from './server'
import serverBuilder from './server_helpers_for_client_tests'
import getPorts from './helpers/port_list'
import mqttPacket, { type IAuthPacket, type IPublishPacket } from 'mqtt-packet'
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

			client.on('error', (error: ErrorWithReasonCode) => {
				assert.strictEqual(
					error.message,
					'Received unregistered Topic Alias',
				)
				// 3.3.4 3)a) codes a zero length Topic Name with no mapping as
				// 0x82 Protocol Error, not the 0x94 the out-of-range cases get
				assert.strictEqual(error.code, 130)
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

	// Also GHSA-c8jq-r765-cq7g, one connection later. The packet queue is per
	// connection, but the discard used to be a field on the client that every
	// `connect()` reassigned. An application that parks inside `handleMessage`
	// and answers after a reconnect resumes the *old* connection's pump, and
	// the violation the pump then found emptied the queue of the connection
	// that had replaced it and destroyed its stream - a connection that never
	// did anything wrong.
	it(
		'should not let a violation on a closed connection touch the connection that replaced it',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const messages: string[] = []
			const errors: ErrorWithReasonCode[] = []
			const parked = new Map<string, () => void>()
			let connections = 0
			let finished = false
			let firstServerClient: any
			let liveConnectionClosed = false

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

			// Every stage of this test is driven by a callback the test itself
			// holds, so a regression stalls rather than fails. Name what is
			// missing instead of waiting out the test timeout.
			const deadline = setTimeout(() => {
				finish(
					new Error(
						`the second connection never delivered the rest of its chunk (connections: ${connections}, messages: [${messages.join(
							', ',
						)}], errors: ${errors.length})`,
					),
				)
			}, 6000)

			const server2 = new MqttServer((serverClient) => {
				connections += 1
				const connection = connections
				if (connection === 1) {
					firstServerClient = serverClient
				} else {
					// The client destroying its stream sends a FIN, so this is
					// how the test sees the live connection being torn down by
					// the dead one's violation.
					serverClient.on('close', () => {
						liveConnectionClosed = true
					})
				}
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// Both publishes are written back to back so they reach the
					// client as one chunk: the first one parks the pump, the
					// second one stays in that connection's queue.
					if (connection === 1) {
						serverClient.publish({
							messageId: 0,
							topic: 'parked/1',
							payload: 'Message',
							qos: 0,
						})
						// the violation, judged long after this connection is
						// gone
						serverClient.publish({
							messageId: 0,
							topic: 'test',
							payload: 'Message',
							qos: 0,
							properties: { topicAlias: 1 },
						})
					} else {
						serverClient.publish({
							messageId: 0,
							topic: 'parked/2',
							payload: 'Message',
							qos: 0,
						})
						serverClient.publish({
							messageId: 0,
							topic: 'survivor',
							payload: 'Message',
							qos: 0,
						})
					}
				})
			}).listen(ports.PORTAND345)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND345,
				protocolVersion: 5,
				reconnectPeriod: 100,
				// deliberately no properties.topicAliasMaximum, so any topic
				// alias is a protocol violation
			})

			client.on('error', (err) => errors.push(err as ErrorWithReasonCode))
			client.on('message', (topic) => messages.push(topic))

			const staged = new Set<string>()

			client.handleMessage = (packet, callback) => {
				const topic = packet.topic.toString()
				// Each topic drives exactly one stage of the test. A repeat
				// means something reconnected that should not have; let it
				// through and leave the verdict to the assertions below.
				if (staged.has(topic)) {
					callback()
					return
				}
				staged.add(topic)
				if (topic === 'parked/1') {
					// Hold the first connection's pump open and drop its
					// socket, so the client reconnects while the violation
					// behind this packet is still unhandled.
					parked.set(topic, () => callback())
					firstServerClient.destroy()
					return
				}
				if (topic === 'parked/2') {
					parked.set(topic, () => callback())
					// The first connection's pump resumes here, finds the
					// topic alias, and must reach for its own queue - not this
					// connection's.
					parked.get('parked/1')()
					// `nextTick` work from that pump drains before this fires.
					setImmediate(() => parked.get('parked/2')())
					return
				}
				callback()
				if (topic !== 'survivor') return
				try {
					assert.deepStrictEqual(
						messages,
						['parked/1', 'parked/2', 'survivor'],
						"the live connection's queue must survive the dead one's violation",
					)
					// The violation is never examined at all: `work()` drops
					// what is still queued on a connection the client has
					// moved on from, so the packet reaches no handler and
					// there is nothing to reject. Reporting a protocol error
					// against a connection that no longer exists would tell
					// the application about a stream it can no longer act on.
					// What this test guards is unchanged: whatever the dead
					// connection was carrying must not reach the live one.
					assert.deepStrictEqual(
						errors.map((err) => err.message),
						[],
						`a packet queued on the dead connection must not surface on the live one, got [${errors
							.map((err) => err.message)
							.join(', ')}]`,
					)
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				// The teardown the violation would trigger is a `destroy()` on
				// the client's stream: its FIN reaches the server within a
				// poll, and a reconnect would follow 100ms later. Give both
				// well over their time before calling the live connection
				// untouched.
				setTimeout(() => {
					try {
						assert.isFalse(
							liveConnectionClosed,
							'the live connection must not be torn down by a violation on the connection it replaced',
						)
						assert.strictEqual(
							connections,
							2,
							'the live connection must not have been torn down',
						)
					} catch (assertErr) {
						return finish(assertErr as Error)
					}
					finish()
				}, 400)
			}

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	// Round 8. The packet queue is per connection, but nothing stopped `work()`
	// from handing a queued packet to a handler after the client had already
	// moved on to a later connection. A CONNACK parked behind a slow
	// `handleMessage` is then judged against the connection that replaced it:
	// the duplicate-CONNACK gate (GHSA-8phv-jwjm-93rr) fires on a healthy
	// connection and tears it down, so the fix for one advisory became a way to
	// trigger the teardown of another.
	it(
		'should drop packets queued on a connection the client has moved on from',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const errors: ErrorWithReasonCode[] = []
			let connections = 0
			let connectEvents = 0
			let finished = false
			let firstServerClient: any
			let liveConnectionClosed = false
			let releaseParked: (() => void) | null = null

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

			const deadline = setTimeout(() => {
				finish(
					new Error(
						`the second connection never settled (connections: ${connections}, connects: ${connectEvents}, errors: [${errors
							.map((err) => err.message)
							.join(', ')}])`,
					),
				)
			}, 6000)

			const server2 = new MqttServer((serverClient) => {
				connections += 1
				const connection = connections
				if (connection === 1) {
					firstServerClient = serverClient
				} else {
					// the client destroying its stream sends a FIN, so this is
					// how the test sees a teardown of the live connection
					serverClient.on('close', () => {
						liveConnectionClosed = true
					})
				}
				serverClient.on('connect', () => {
					if (connection !== 1) {
						serverClient.connack({ reasonCode: 0 })
						return
					}
					// One chunk, parsed in full before its first packet is
					// handled: the CONNACK is accepted, the PUBLISH parks the
					// pump, and the second CONNACK stays queued on this
					// connection until the application answers.
					serverClient.stream.write(
						Buffer.concat([
							mqttPacket.generate(
								{ cmd: 'connack', reasonCode: 0 } as any,
								{ protocolVersion: 5 },
							),
							mqttPacket.generate(
								{
									cmd: 'publish',
									topic: 'parked',
									payload: Buffer.from('Message'),
									qos: 0,
									retain: false,
									dup: false,
								} as IPublishPacket,
								{ protocolVersion: 5 },
							),
							mqttPacket.generate(
								{ cmd: 'connack', reasonCode: 0 } as any,
								{ protocolVersion: 5 },
							),
						]),
					)
				})
			}).listen(ports.PORTAND349)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND349,
				protocolVersion: 5,
				reconnectPeriod: 100,
			})

			client.on('error', (err) => errors.push(err as ErrorWithReasonCode))

			client.handleMessage = (packet, callback) => {
				if (packet.topic.toString() !== 'parked' || releaseParked) {
					callback()
					return
				}
				// Hold this connection's pump open and drop its socket, so the
				// client reconnects while the CONNACK behind this packet is
				// still queued.
				releaseParked = () => callback()
				firstServerClient.destroy()
			}

			client.on('connect', () => {
				connectEvents += 1
				if (connectEvents !== 2) return
				// The dead connection's pump resumes here and reaches its
				// queued CONNACK. It must find nothing to do.
				setImmediate(() => releaseParked?.())
				setTimeout(() => {
					try {
						assert.isFalse(
							liveConnectionClosed,
							'a packet queued on the dead connection must not tear down the connection that replaced it',
						)
						assert.strictEqual(
							connections,
							2,
							'the live connection must not have been torn down',
						)
						assert.strictEqual(
							connectEvents,
							2,
							'a queued CONNACK must not re-run `_onConnect` on a later connection',
						)
						assert.deepStrictEqual(
							errors.map((err) => err.code),
							[],
							`no error was expected, got [${errors
								.map((err) => err.message)
								.join(', ')}]`,
						)
					} catch (assertErr) {
						return finish(assertErr as Error)
					}
					finish()
				}, 600)
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	// Round 8. `rejectAuth` tore the connection down unconditionally, but
	// `client.handleAuth` is application-overridable and answers through a
	// callback: one that fetches a token answers whenever the token arrives.
	// By then the client may be on a later connection, and the teardown lands
	// on a stream that never saw the AUTH. The `work()` guard above cannot
	// catch this one - the callback runs outside the pump loop entirely.
	it(
		'should not let a parked auth exchange tear down the connection that replaced it',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			const errors: ErrorWithReasonCode[] = []
			let connections = 0
			let connectEvents = 0
			let finished = false
			let firstServerClient: any
			let liveConnectionClosed = false
			let releaseAuth: ((err: Error) => void) | null = null

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

			const deadline = setTimeout(() => {
				finish(
					new Error(
						`the second connection never settled (connections: ${connections}, connects: ${connectEvents}, errors: [${errors
							.map((err) => err.message)
							.join(', ')}])`,
					),
				)
			}, 6000)

			const server2 = new MqttServer((serverClient) => {
				connections += 1
				const connection = connections
				if (connection === 1) {
					firstServerClient = serverClient
				} else {
					serverClient.on('close', () => {
						liveConnectionClosed = true
					})
				}
				serverClient.on('connect', () => {
					serverClient.connack({
						reasonCode: 0,
						properties: { authenticationMethod: 'test' },
					})
					if (connection !== 1) return
					// an AUTH the application will only answer once this
					// connection is gone
					serverClient.stream.write(
						mqttPacket.generate(
							{
								cmd: 'auth',
								reasonCode: 24,
								properties: { authenticationMethod: 'test' },
							} as IAuthPacket,
							{ protocolVersion: 5 },
						),
					)
				})
			}).listen(ports.PORTAND350)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND350,
				protocolVersion: 5,
				reconnectPeriod: 100,
				properties: { authenticationMethod: 'test' },
			})

			client.on('error', (err) => errors.push(err as ErrorWithReasonCode))

			client.handleAuth = (packet, callback) => {
				if (releaseAuth) return
				// park the exchange and drop the socket it belongs to
				releaseAuth = callback as (err: Error) => void
				firstServerClient.destroy()
			}

			client.on('connect', () => {
				connectEvents += 1
				if (connectEvents !== 2) return
				// Refusing the parked exchange now must report the error
				// without touching the connection that replaced it.
				setImmediate(() =>
					releaseAuth?.(new Error('answered too late')),
				)
				setTimeout(() => {
					try {
						assert.isFalse(
							liveConnectionClosed,
							'a parked auth exchange must not tear down the connection that replaced it',
						)
						assert.strictEqual(
							connections,
							2,
							'the live connection must not have been torn down',
						)
						assert.deepStrictEqual(
							errors.map((err) => err.message),
							['answered too late'],
							'the application must still be told the exchange failed',
						)
					} catch (assertErr) {
						return finish(assertErr as Error)
					}
					finish()
				}, 600)
			})

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
		'should reject an unsolicited auth packet received after connack',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			let deadline: NodeJS.Timeout
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// unsolicited "Continue authentication" from the broker
					serverClient.auth({ reasonCode: 24 })
				})
			}).listen(ports.PORTAND121)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND121,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})

			let errored = false

			// `connect` itself is expected here: the AUTH rides in the same
			// chunk as the connack. What must not happen is the connection
			// surviving it. Without this a regressed guard leaves the test
			// hanging to its 5s timeout instead of saying what went wrong.
			client.once('connect', () => {
				deadline = setTimeout(
					() =>
						finish(
							new Error(
								errored
									? 'the unsolicited auth packet raised an error but did not tear the connection down'
									: 'the unsolicited auth packet was accepted: no error emitted',
							),
						),
					500,
				)
			})

			client.once('error', (error: ErrorWithReasonCode) => {
				errored = true
				try {
					assert.strictEqual(
						error.message,
						'Protocol error: Auth packet received but enhanced authentication was not requested',
					)
					assert.strictEqual(error.code, 130)
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				// the connection must go down, not just raise an error and let
				// the broker keep sending
				client.once('close', () => finish())
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should reject an unsolicited auth packet received before connack',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					// no connack at all, just the auth packet
					serverClient.auth({ reasonCode: 24 })
				})
			}).listen(ports.PORTAND122)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND122,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})

			// no connack is ever sent, so connecting at all means the
			// unsolicited AUTH was taken for a finished handshake
			client.once('connect', () =>
				finish(
					new Error(
						'the unsolicited auth packet was accepted and the client connected',
					),
				),
			)

			// and if it is accepted silently nothing happens at all, so fail
			// readably rather than hang to the test's 5s timeout
			let errored = false
			const deadline = setTimeout(
				() =>
					finish(
						new Error(
							errored
								? 'the unsolicited auth packet raised an error but did not tear the connection down'
								: 'the unsolicited auth packet was not rejected: no error emitted',
						),
					),
				1500,
			)

			client.once('error', (error: ErrorWithReasonCode) => {
				errored = true
				try {
					assert.strictEqual(
						error.message,
						'Protocol error: Auth packet received but enhanced authentication was not requested',
					)
					assert.strictEqual(error.code, 130)
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				client.once('close', () => finish())
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should drop the rest of the chunk it rejected an unsolicited auth packet in',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let settle: NodeJS.Timeout
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				clearTimeout(settle)
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// one write, so both packets are parsed out of the same
					// chunk before either is handled: rejecting the unsolicited
					// AUTH has to throw the PUBLISH behind it away instead of
					// running it against the stream it just destroyed
					serverClient.stream.write(
						Buffer.concat([
							mqttPacket.generate(
								{ cmd: 'auth', reasonCode: 24 } as IAuthPacket,
								{ protocolVersion: 5 },
							),
							mqttPacket.generate(
								{
									cmd: 'publish',
									topic: 'after-teardown',
									payload: Buffer.from('nope'),
									qos: 0,
									retain: false,
									dup: false,
								} as IPublishPacket,
								{ protocolVersion: 5 },
							),
						]),
					)
				})
			}).listen(ports.PORTAND347)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND347,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})

			client.on('message', (topic) =>
				finish(
					new Error(
						`a message on "${topic}" was handled after the connection was torn down`,
					),
				),
			)

			let errored = false
			const deadline = setTimeout(
				() =>
					finish(
						new Error(
							errored
								? 'the unsolicited auth packet raised an error but did not tear the connection down'
								: 'the unsolicited auth packet was not rejected: no error emitted',
						),
					),
				1500,
			)

			client.once('error', (error: ErrorWithReasonCode) => {
				errored = true
				try {
					assert.strictEqual(
						error.message,
						'Protocol error: Auth packet received but enhanced authentication was not requested',
					)
					assert.strictEqual(error.code, 130)
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				client.once('close', () => {
					clearTimeout(deadline)
					// leave the pump the time it would need to run the
					// discarded PUBLISH: the `message` listener above fails
					// the test if it ever does
					settle = setTimeout(() => finish(), 300)
				})
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should reject an auth packet whose authentication method is not the one sent in connect',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// MQTT-4.12.0-3: switching the method mid-exchange is a
					// protocol violation, and would otherwise reach handleAuth
					serverClient.auth({
						reasonCode: 24,
						properties: { authenticationMethod: 'weaker' },
					})
				})
			}).listen(ports.PORTAND126)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND126,
				protocolVersion: 5,
				reconnectPeriod: 0,
				properties: { authenticationMethod: 'json' },
			})

			// must never run: the guard refuses the packet before it gets here
			client.handleAuth = () => {
				finish(
					new Error(
						'a mismatched Authentication Method reached handleAuth',
					),
				)
			}

			let errored = false
			const deadline = setTimeout(
				() =>
					finish(
						new Error(
							errored
								? 'the mismatched Authentication Method raised an error but did not tear the connection down'
								: 'the mismatched Authentication Method was accepted: no error emitted',
						),
					),
				1500,
			)

			client.once('error', (error: ErrorWithReasonCode) => {
				errored = true
				try {
					assert.strictEqual(
						error.message,
						'Protocol error: Auth packet Authentication Method does not match the "json" sent in CONNECT',
					)
					assert.strictEqual(error.code, 130)
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				client.once('close', () => finish())
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should emit an error when handleAuth provides no packet to continue the auth exchange',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					serverClient.auth({
						reasonCode: 24,
						properties: { authenticationMethod: 'json' },
					})
				})
			}).listen(ports.PORTAND123)

			// enhanced auth is requested but the default handleAuth
			// completes without providing a packet
			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND123,
				protocolVersion: 5,
				reconnectPeriod: 0,
				properties: { authenticationMethod: 'json' },
			})

			let errored = false
			const deadline = setTimeout(
				() =>
					finish(
						new Error(
							errored
								? 'the missing continuation packet raised an error but did not tear the connection down'
								: 'the missing continuation packet was accepted: no error emitted',
						),
					),
				1500,
			)

			client.once('error', (error: ErrorWithReasonCode) => {
				errored = true
				try {
					assert.strictEqual(
						error.message,
						'Protocol error: No auth packet to continue the authentication exchange',
					)
					assert.strictEqual(error.code, 130)
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				// the exchange cannot continue and the connack timer is already
				// cleared, so the socket must not be left up
				client.once('close', () => finish())
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should tear down when handleAuth reports an error',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					serverClient.auth({
						reasonCode: 24,
						properties: { authenticationMethod: 'json' },
					})
				})
			}).listen(ports.PORTAND128)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND128,
				protocolVersion: 5,
				reconnectPeriod: 0,
				properties: { authenticationMethod: 'json' },
			})

			client.handleAuth = (packet, callback) => {
				callback(new Error('handleAuth said no'))
			}

			let errored = false
			const deadline = setTimeout(
				() =>
					finish(
						new Error(
							errored
								? 'the handleAuth error did not tear the connection down'
								: 'the handleAuth error was swallowed: no error emitted',
						),
					),
				1500,
			)

			client.once('error', (error) => {
				errored = true
				try {
					// the application's own error reaches it unchanged
					assert.strictEqual(error.message, 'handleAuth said no')
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				// the exchange cannot go on and the connack timer is already
				// cleared, so the socket must not be left up
				client.once('close', () => finish())
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should send the packet returned by a custom handleAuth',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					serverClient.auth({
						reasonCode: 24,
						properties: { authenticationMethod: 'json' },
					})
				})
				serverClient.on('auth', (packet) => {
					try {
						assert.strictEqual(packet.reasonCode, 24)
						assert.strictEqual(
							packet.properties.authenticationMethod,
							'json',
						)
						finish()
					} catch (error) {
						finish(error)
					}
				})
			}).listen(ports.PORTAND124)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND124,
				protocolVersion: 5,
				reconnectPeriod: 0,
				properties: { authenticationMethod: 'json' },
			})

			client.handleAuth = (packet, callback) => {
				callback(null, {
					cmd: 'auth',
					reasonCode: 24,
					properties: {
						authenticationMethod: 'json',
						authenticationData: Buffer.from('continue'),
					},
				})
			}

			client.on('error', (error) => finish(error))

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should stay connected on an auth packet with reason code 0',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// MQTT 5 3.15.2.1: reason code 0 on AUTH is "Success", the
					// broker signing off on the authentication, not a refusal
					serverClient.auth({
						reasonCode: 0,
						properties: { authenticationMethod: 'json' },
					})
				})
			}).listen(ports.PORTAND125)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND125,
				protocolVersion: 5,
				reconnectPeriod: 0,
				properties: { authenticationMethod: 'json' },
			})

			client.once('error', (error) =>
				finish(
					new Error(
						`a successful auth exchange must not emit an error, got: ${error.message}`,
					),
				),
			)
			client.once('close', () =>
				finish(
					new Error(
						'a successful auth exchange must not tear the connection down',
					),
				),
			)

			// give the AUTH time to arrive and be handled, then check the
			// connection is still up
			client.once('connect', () => {
				setTimeout(() => {
					try {
						assert.isTrue(
							client.connected,
							'client should still be connected',
						)
					} catch (assertErr) {
						return finish(assertErr as Error)
					}
					finish()
				}, 300)
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should emit an error and tear down on an auth reason code a broker may not send',
		{
			timeout: 5000,
		},
		function _test(t, done) {
			let finished = false
			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(deadline)
				client.end(true, () => {
					server2.close(() => done(err))
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// 25 is "Re-authenticate", which only a client may send
					serverClient.auth({
						reasonCode: 25,
						properties: { authenticationMethod: 'json' },
					})
				})
			}).listen(ports.PORTAND127)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND127,
				protocolVersion: 5,
				reconnectPeriod: 0,
				properties: { authenticationMethod: 'json' },
			})

			let errored = false
			const deadline = setTimeout(
				() =>
					finish(
						new Error(
							errored
								? 'the invalid auth reason code raised an error but did not tear the connection down'
								: 'the invalid auth reason code was accepted: no error emitted',
						),
					),
				1500,
			)

			client.once('error', (error: ErrorWithReasonCode) => {
				errored = true
				try {
					assert.strictEqual(
						error.message,
						'Protocol error: Auth packet reason code 25 is not one a broker may send',
					)
					assert.strictEqual(error.code, 130)
				} catch (assertErr) {
					return finish(assertErr as Error)
				}
				// the exchange is over: the socket must not be left up
				client.once('close', () => finish())
			})

			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
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
				assert.include(error.message, 'exceeding packets size connack')
				assert.include(error.message, 'maximumPacketSize is 1')
				assert.strictEqual((error as ErrorWithReasonCode).code, 149)
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
				// the broker values are the ones in use on this connection...
				assert.strictEqual(client.keepalive, 16)
				assert.strictEqual(client.keepaliveManager.keepalive, 16000)
				// ...but they are never merged into the user options
				assert.strictEqual(client.options.keepalive, 60)
				assert.strictEqual(
					client.options.properties.maximumPacketSize,
					100,
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
		'should not write CONNACK properties into the user options object',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			let finished = false
			let client2: mqtt.MqttClient

			const closeAll = (err?: Error) => {
				evilServer.close(() => {
					benignServer.close((err2) => {
						done(err || err2)
					})
				})
			}

			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				client.end(true, () => {
					if (!client2) {
						return closeAll(err)
					}
					client2.end(true, () => closeAll(err))
				})
			}

			// asserting straight inside an event handler turns a regression into
			// a 15s timeout, the throw never reaches the test runner
			const check = (fn: () => void) => {
				try {
					fn()
					return true
				} catch (err) {
					finish(err as Error)
					return false
				}
			}

			const evilServer = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({
						reasonCode: 0,
						properties: {
							serverKeepAlive: 16,
							maximumPacketSize: 1,
						},
					})
				})
			}).listen(ports.PORTAND330)

			const benignServer = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
				})
			}).listen(ports.PORTAND331)

			// the very same object is later reused for a second client, as
			// applications sharing a config factory do
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND330,
				protocolVersion: 5,
				keepalive: 30,
				reconnectPeriod: 0,
			}

			const client = mqtt.connect(opts)

			client.on('error', (err) => finish(err))

			client.on('connect', () => {
				if (
					!check(() => {
						assert.strictEqual(client.keepalive, 16)
						assert.strictEqual(opts.keepalive, 30)
						assert.isUndefined(opts.properties)
					})
				) {
					return
				}

				client.end(true, () => {
					opts.port = ports.PORTAND331
					client2 = mqtt.connect(opts)
					client2.on('error', (err) => finish(err))
					client2.on('connect', () => {
						check(() => {
							assert.strictEqual(client2.keepalive, 30)
						})
						finish()
					})
				})
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave both ports bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					client2?.end(true)
					evilServer.close()
					benignServer.close()
				}
			})
		},
	)

	// The other direction: the connect packet is built from the user options and
	// then written into - `topicAliasMaximum` used to be stored straight back
	// into the caller's own properties object.
	it(
		'should not write connect packet properties into the user options object',
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

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
				})
			}).listen(ports.PORTAND337)

			const properties: mqtt.IClientOptions['properties'] = {
				topicAliasMaximum: 3,
			}
			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND337,
				protocolVersion: 5,
				reconnectPeriod: 0,
				// the connect packet is written from inside `connect()`, so the
				// listener has to be attached before that runs
				manualConnect: true,
				properties,
			}

			const client = mqtt.connect(opts)
			client.on('error', (error) => finish(error))
			client.on('packetsend', (packet) => {
				if (packet.cmd !== 'connect') {
					return
				}
				try {
					assert.notStrictEqual(
						packet.properties,
						properties,
						'the connect packet must not be written into the caller object',
					)
					assert.strictEqual(packet.properties.topicAliasMaximum, 3)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			client.connect()

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should not apply the broker maximum packet size to inbound packets',
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

			// the CONNACK `Maximum Packet Size` (§3.2.2.3.6) is what the broker
			// accepts, it says nothing about what the broker may send us
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({
						reasonCode: 0,
						properties: { maximumPacketSize: 1 },
					})
					serverClient.publish({
						messageId: 0,
						topic: 'a/b',
						payload: 'a payload longer than 1 byte',
						qos: 0,
					})
				})
			}).listen(ports.PORTAND332)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND332,
				protocolVersion: 5,
				reconnectPeriod: 0,
			}

			const client = mqtt.connect(opts)
			client.on('error', (error) => finish(error))
			client.on('message', (topic, payload) => {
				try {
					assert.strictEqual(topic, 'a/b')
					assert.strictEqual(
						payload.toString(),
						'a payload longer than 1 byte',
					)
					assert.strictEqual(
						client.serverProperties.maximumPacketSize,
						1,
					)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should not let the broker re-enable a disabled keepalive',
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

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({
						reasonCode: 0,
						properties: { serverKeepAlive: 16 },
					})
				})
			}).listen(ports.PORTAND335)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND335,
				protocolVersion: 5,
				keepalive: 0,
				reconnectPeriod: 0,
			}

			const client = mqtt.connect(opts)
			client.on('error', (error) => finish(error))
			client.on('connect', () => {
				try {
					assert.strictEqual(client.keepalive, 0)
					assert.strictEqual(client.options.keepalive, 0)
					// keepalive disabled means no manager at all, so no pings
					assert.isNotOk(client.keepaliveManager)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should reconnect after receiving a packet over the configured maximum size',
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

			let connects = 0
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					connects++
					serverClient.connack({ reasonCode: 0 })
					if (connects === 1) {
						serverClient.publish({
							messageId: 0,
							topic: 'a/b',
							payload: 'a payload longer than 10 bytes',
							qos: 0,
						})
					}
				})
			}).listen(ports.PORTAND336)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND336,
				protocolVersion: 5,
				reconnectPeriod: 100,
				properties: { maximumPacketSize: 10 },
			}

			let errors = 0
			const client = mqtt.connect(opts)
			client.on('error', (error) => {
				errors++
				try {
					assert.include(
						error.message,
						'exceeding packets size publish',
					)
					assert.include(error.message, 'maximumPacketSize is 10')
					assert.strictEqual((error as ErrorWithReasonCode).code, 149)
				} catch (err) {
					finish(err as Error)
				}
			})
			client.on('connect', () => {
				if (connects < 2) {
					return
				}
				try {
					// the client reconnected on its own: an oversized packet is
					// not a kill switch a hostile broker can pull
					assert.strictEqual(errors, 1)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should drop the rest of the chunk an oversized packet came in',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			let settle: NodeJS.Timeout
			let finished = false

			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(settle)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err || err1 || err2)
					})
				})
			}

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					// one write, so both packets are parsed out of the same
					// chunk before either is handled: dropping the connection
					// over the first has to throw the second away instead of
					// handling it against the stream it just destroyed
					serverClient.stream.write(
						Buffer.concat([
							mqttPacket.generate(
								{
									cmd: 'publish',
									topic: 'a/b',
									payload: Buffer.from(
										'a payload longer than 30 bytes, by a lot',
									),
									qos: 0,
									retain: false,
									dup: false,
								} as IPublishPacket,
								{ protocolVersion: 5 },
							),
							mqttPacket.generate(
								{
									cmd: 'publish',
									topic: 'ok',
									payload: Buffer.from('y'),
									qos: 0,
									retain: false,
									dup: false,
								} as IPublishPacket,
								{ protocolVersion: 5 },
							),
						]),
					)
				})
			}).listen(ports.PORTAND348)

			const client = mqtt.connect({
				host: 'localhost',
				port: ports.PORTAND348,
				protocolVersion: 5,
				reconnectPeriod: 0,
				properties: { maximumPacketSize: 30 },
			})

			client.on('message', (topic) =>
				finish(
					new Error(
						`a message on "${topic}" was handled after the connection was torn down`,
					),
				),
			)

			client.once('error', (error) => {
				try {
					assert.include(
						error.message,
						'exceeding packets size publish',
					)
					assert.strictEqual((error as ErrorWithReasonCode).code, 149)
				} catch (err) {
					return finish(err as Error)
				}
				// leave the pump the time it would need to run the discarded
				// PUBLISH: the `message` listener above fails the test if it
				// ever does
				settle = setTimeout(() => finish(), 300)
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should keep enforcing the configured maximum packet size when the broker sends a bigger one',
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

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({
						reasonCode: 0,
						properties: { maximumPacketSize: 1000 },
					})
					serverClient.publish({
						messageId: 0,
						topic: 'a/b',
						payload: 'a payload longer than 10 bytes',
						qos: 0,
					})
				})
			}).listen(ports.PORTAND333)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND333,
				protocolVersion: 5,
				reconnectPeriod: 0,
				// comfortably above the CONNACK, well below the PUBLISH
				properties: { maximumPacketSize: 20 },
			}

			const client = mqtt.connect(opts)
			// a regression accepts the packet instead of raising, and waiting
			// only for `error` would turn that into a 15s timeout
			client.on('message', () => {
				finish(
					new Error(
						'the oversized packet was accepted: the broker limit replaced the configured one',
					),
				)
			})
			client.on('error', (error) => {
				try {
					assert.include(
						error.message,
						'exceeding packets size publish',
					)
					// the configured limit, not the bigger one the broker sent
					assert.include(error.message, 'maximumPacketSize is 20')
					assert.strictEqual((error as ErrorWithReasonCode).code, 149)
					assert.strictEqual(
						client.options.properties.maximumPacketSize,
						20,
					)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should count the fixed header towards the maximum packet size',
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

			// This PUBLISH has a Remaining Length of 16: 2 topic length + 3
			// topic + 1 empty property length + 10 payload. On the wire it is 18
			// bytes, the fixed header byte and the single byte encoding the
			// Remaining Length included, and it is the wire size that `Maximum
			// Packet Size` bounds (§3.1.2.11.4, §2.1.4).
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
					serverClient.publish({
						messageId: 0,
						topic: 'a/b',
						payload: '0123456789',
						qos: 0,
					})
				})
			}).listen(ports.PORTAND340)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND340,
				protocolVersion: 5,
				reconnectPeriod: 0,
				// exactly the Remaining Length of that PUBLISH: comparing
				// against that alone used to let 2 bytes too many through
				properties: { maximumPacketSize: 16 },
			}

			const client = mqtt.connect(opts)
			// a regression accepts the packet instead of raising, and waiting
			// only for `error` would turn that into a 15s timeout
			client.on('message', () => {
				finish(
					new Error(
						'a packet 2 bytes over the advertised maximum was accepted',
					),
				)
			})
			client.on('error', (error) => {
				try {
					assert.include(
						error.message,
						'exceeding packets size publish',
					)
					assert.include(error.message, '18 bytes')
					assert.include(error.message, 'maximumPacketSize is 16')
					assert.strictEqual((error as ErrorWithReasonCode).code, 149)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should not carry broker properties over to the next connection',
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

			let connects = 0
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					connects++
					serverClient.connack(
						connects === 1
							? {
									reasonCode: 0,
									properties: { serverKeepAlive: 16 },
								}
							: { reasonCode: 0 },
					)
				})
			}).listen(ports.PORTAND334)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND334,
				protocolVersion: 5,
				keepalive: 30,
				reconnectPeriod: 100,
			}

			const client = mqtt.connect(opts)
			client.on('error', (error) => finish(error))
			// the reset has to happen on `close`, not merely be overwritten by
			// the next CONNACK: the second CONNACK here carries no properties,
			// so asserting only after it would pass with the reset deleted
			let closes = 0
			client.on('close', () => {
				closes++
				if (closes > 1) {
					return
				}
				try {
					assert.isUndefined(client.serverProperties)
					assert.strictEqual(client.keepalive, 30)
				} catch (err) {
					finish(err as Error)
				}
			})
			client.on('connect', () => {
				if (connects === 1) {
					try {
						assert.strictEqual(client.keepalive, 16)
						assert.strictEqual(
							client.serverProperties.serverKeepAlive,
							16,
						)
					} catch (err) {
						return finish(err as Error)
					}
					client.stream.end()
					return
				}
				try {
					assert.strictEqual(client.keepalive, 30)
					assert.strictEqual(client.keepaliveManager.keepalive, 30000)
					assert.isUndefined(client.serverProperties)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should tear the connection down before emitting a keepalive timeout',
		{
			timeout: 15000,
		},
		function _test(t, done) {
			let finished = false
			let timer: ReturnType<typeof setTimeout>

			const finish = (err?: Error) => {
				if (finished) return
				finished = true
				clearTimeout(timer)
				client.end(true, (err1) => {
					server2.close((err2) => {
						done(err || err1 || err2)
					})
				})
			}

			// accepts the connection and then says nothing at all: no PINGRESP,
			// nothing, the broker a keepalive timeout exists for
			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
				})
			}).listen(ports.PORTAND338)

			// the raw TCP socket is the one piece of state the client cannot
			// fake: a teardown skipped client side leaves it open here
			let socketClosed = false
			let onSocketClose: () => void
			server2.on('connection', (socket) => {
				socket.on('close', () => {
					socketClosed = true
					onSocketClose?.()
				})
			})

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				// a keepalive long enough that the real timer never races the
				// assertions: a regression has to fail on them, not by throwing
				// out of a timer callback and taking the whole run down
				keepalive: 60,
				port: ports.PORTAND338,
				protocolVersion: 5,
				reconnectPeriod: 0,
			}

			const client = mqtt.connect(opts)
			client.on('connect', () => {
				// Negative control: with no `error` listener `emit` itself
				// throws, which is the state a directly constructed
				// `MqttClient` is in - only `mqtt.connect()` attaches one.
				// node:test fails a test on any uncaughtException, even with an
				// own handler installed, so the throw has to happen on our own
				// stack instead of inside the keepalive timer - this is the
				// call the KeepaliveManager makes.
				client.removeAllListeners('error')
				try {
					assert.throws(
						() => client.onKeepaliveTimeout(),
						/Keepalive timeout/,
					)
				} catch (err) {
					return finish(err as Error)
				}

				if (socketClosed) {
					return finish()
				}
				onSocketClose = () => finish()
				timer = setTimeout(() => {
					finish(
						new Error(
							'the broker still sees the socket open after a keepalive timeout',
						),
					)
				}, 2000)
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					clearTimeout(timer)
					client.end(true)
					server2.close()
				}
			})
		},
	)

	it(
		'should keep the configured keepalive after a refused CONNACK',
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

			const server2 = new MqttServer((serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({
						reasonCode: 135,
						properties: {
							serverKeepAlive: 16,
							reasonString: 'go away',
						},
					})
				})
			}).listen(ports.PORTAND339)

			const opts: mqtt.IClientOptions = {
				host: 'localhost',
				port: ports.PORTAND339,
				protocolVersion: 5,
				keepalive: 30,
				reconnectPeriod: 0,
			}

			const client = mqtt.connect(opts)
			client.on('connect', () =>
				finish(
					new Error('the refused CONNACK was treated as accepted'),
				),
			)
			client.on('error', (error) => {
				try {
					assert.include(error.message, 'Connection refused')
					assert.strictEqual((error as ErrorWithReasonCode).code, 135)
					// the refusal explains itself: the only reason the
					// properties of a refused CONNACK are kept at all
					assert.strictEqual(
						client.serverProperties.reasonString,
						'go away',
					)
					assert.strictEqual(
						client.serverProperties.serverKeepAlive,
						16,
					)
					// ...but no connection was opened, and with the default
					// `reconnectOnConnackError: false` no `close` follows, so a
					// `serverKeepAlive` honoured here would stick for good
					assert.isNotOk(client.connected)
					assert.strictEqual(client.keepalive, 30)
				} catch (err) {
					return finish(err as Error)
				}
				finish()
			})

			// a test that times out never reaches `finish`, and would otherwise
			// leave the port bound and cascade EADDRINUSE into the next ones
			t.after(() => {
				if (!finished) {
					client.end(true)
					server2.close()
				}
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
