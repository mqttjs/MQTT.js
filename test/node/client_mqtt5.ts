import { assert } from 'chai'
import { after, describe, it } from 'node:test'
import abstractClientTests from './abstract_client'
import { MqttServer } from './server'
import serverBuilder from './server_helpers_for_client_tests'
import getPorts from './helpers/port_list'
import mqtt, { type ErrorWithReasonCode } from '../../src'
import { type IAuthPacket } from 'mqtt-packet'

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
					'Received Topic Alias is out of range',
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
					'Received Topic Alias is out of range',
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

	describe('reauthenticate', () => {
		it(
			'should successfully reauthenticate with a new token',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 20
				const authMethod = 'GS-AUTH'
				const initialToken = Buffer.from('initial-token')
				const newToken = Buffer.from('new-refreshed-token')

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', (packet) => {
						assert.ok(
							packet.properties.authenticationData.equals(
								initialToken,
							),
						)
						serverClient.connack({ reasonCode: 0 })
					})

					serverClient.on('auth', (packet) => {
						assert.strictEqual(packet.reasonCode, 0x19)
						assert.ok(
							packet.properties.authenticationData.equals(
								newToken,
							),
						)
						serverClient.auth({ reasonCode: 0 })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: {
						authenticationMethod: authMethod,
						authenticationData: initialToken,
					},
				})

				client.on('connect', () => {
					client.reauthenticate(
						{ authenticationData: newToken },
						(err, packet: IAuthPacket) => {
							assert.ifError(err)
							assert.strictEqual(packet.reasonCode, 0)
							client.once('reauth', (packet) => {
								assert.strictEqual(packet.reasonCode, 0)
								client.end(true, () => testServer.close(done))
							})
						},
					)
				})
			},
		)

		it(
			'should error if reauthenticate is called while disconnected',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 21
				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () =>
						serverClient.connack({ reasonCode: 0 }),
					)
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: { authenticationMethod: 'test' },
				})

				client.once('connect', () => {
					client.end(true, () => {
						client.reauthenticate(
							{ authenticationData: Buffer.from('test') },
							(err) => {
								assert.ok(err)
								assert.strictEqual(
									err.message,
									'reauthenticate: client is not connected',
								)
								testServer.close(done)
							},
						)
					})
				})
			},
		)

		it(
			'should return an error if reauthenticate is called on a non-v5 connection',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 22
				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () =>
						serverClient.connack({ returnCode: 0 }),
					)
				}).listen(port)

				const client = mqtt.connect({ port, protocolVersion: 4 })

				client.on('connect', () => {
					client.reauthenticate(
						{ authenticationData: Buffer.from('test') },
						(err) => {
							assert.ok(err)
							assert.strictEqual(
								err.message,
								'reauthenticate: this feature works only with mqtt-v5',
							)
							client.end(true, () => testServer.close(done))
						},
					)
				})
			},
		)

		it('should emit error if handleAuth returns an error during 0x18 continue', function (t, done) {
			const port = ports.PORTAND327 + 23
			const testServer = serverBuilder('mqtt', (serverClient) => {
				serverClient.on('connect', () => {
					serverClient.connack({ reasonCode: 0 })
				})
				serverClient.on('auth', () => {
					serverClient.auth({
						reasonCode: 0x18,
						properties: {
							authenticationMethod: 'test',
							authenticationData: Buffer.from('challenge'),
						},
					})
				})
			}).listen(port)

			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				properties: { authenticationMethod: 'test' },
			})

			client.handleAuth = (_packet, callback) => {
				callback(new Error('user-auth-failure'))
			}

			client.once('error', (err) => {
				assert.strictEqual(err.message, 'user-auth-failure')
				client.end(true, () => testServer.close(done))
			})

			client.on('connect', () => {
				client.reauthenticate({
					authenticationData: Buffer.from('test'),
				})
			})
		})

		it('should handle pre-connack 0x18 enhanced authentication', function (t, done) {
			const port = ports.PORTAND327 + 24
			let step = 0
			const testServer = serverBuilder('mqtt', (serverClient) => {
				serverClient.on('connect', () => {
					serverClient.auth({
						reasonCode: 0x18,
						properties: {
							authenticationMethod: 'test',
							authenticationData: Buffer.from('challenge'),
						},
					})
				})
				serverClient.on('auth', () => {
					step++
					if (step === 1) {
						serverClient.connack({ reasonCode: 0 })
					}
				})
			}).listen(port)

			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				properties: {
					authenticationMethod: 'test',
					authenticationData: Buffer.from('init'),
				},
			})

			client.handleAuth = (_packet, callback) => {
				callback(null, {
					cmd: 'auth',
					reasonCode: 0x18,
					properties: {
						authenticationMethod: 'test',
						authenticationData: Buffer.from('response'),
					},
				})
			}

			client.once('connect', () => {
				client.end(true, () => testServer.close(done))
			})
		})

		it(
			'should not crash if reauthenticate is called without a callback',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 25

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () =>
						serverClient.connack({ reasonCode: 0 }),
					)

					serverClient.on('auth', (packet) => {
						assert.strictEqual(packet.reasonCode, 0x19)
						assert.ok(
							packet.properties.authenticationData.equals(
								Buffer.from('test'),
							),
						)
						serverClient.auth({ reasonCode: 0 })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: { authenticationMethod: 'test' },
				})

				client.once('reauth', () => {
					client.end(true, () => testServer.close(done))
				})

				client.once('connect', () => {
					client.reauthenticate({
						authenticationData: Buffer.from('test'),
					})
				})
			},
		)

		it(
			'should error if reauthenticate is called without an initial authenticationMethod',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 26

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () =>
						serverClient.connack({ reasonCode: 0 }),
					)
				}).listen(port, () => {
					const client = mqtt.connect({
						port,
						protocolVersion: 5,
					})

					client.on('connect', () => {
						client.reauthenticate(
							{ authenticationData: Buffer.from('test') },
							(err) => {
								assert.ok(err)
								assert.strictEqual(
									err.message,
									'reauthenticate: authenticationMethod is required from initial CONNECT',
								)
								client.end(true, () => testServer.close(done))
							},
						)
					})
				})
			},
		)

		it(
			'should error if broker returns a non-zero reason code',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 27

				const FAILING_RC = 0x19
				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () => {
						serverClient.connack({ reasonCode: 0 })
					})

					serverClient.on('auth', (packet) => {
						assert.strictEqual(packet.reasonCode, 0x19)
						assert.ok(
							packet.properties.authenticationData.equals(
								Buffer.from('test'),
							),
						)
						serverClient.auth({ reasonCode: FAILING_RC })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: { authenticationMethod: 'test' },
				})

				client.once('connect', () => {
					client.reauthenticate(
						{ authenticationData: Buffer.from('test') },
						(err, packet: IAuthPacket) => {
							assert.ok(err)
							assert.strictEqual(packet.reasonCode, FAILING_RC)
							client.end(true, () => testServer.close(done))
						},
					)
				})
			},
		)

		it('should reject a second reauthentication while the first is in progress', function (t, done) {
			const port = ports.PORTAND327 + 28
			let authPacketCount = 0
			let firstCallbackErr: Error | null = null
			let secondCallbackErr: Error | null = null
			let firstCallbackPacket: IAuthPacket | null = null

			const testServer = serverBuilder('mqtt', (serverClient) => {
				serverClient.on('connect', () =>
					serverClient.connack({ reasonCode: 0 }),
				)

				serverClient.on('auth', (packet) => {
					authPacketCount++

					assert.strictEqual(
						packet.properties?.authenticationData?.toString(),
						'first',
					)

					// Delay response so first reauth stays in progress
					setTimeout(() => {
						serverClient.auth({ reasonCode: 0x00 })
					}, 50)
				})
			}).listen(port)

			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				properties: { authenticationMethod: 'test' },
			})

			client.on('connect', () => {
				client.reauthenticate(
					{ authenticationData: Buffer.from('first') },
					(err, packet) => {
						firstCallbackErr = err
						firstCallbackPacket = packet
					},
				)

				client.reauthenticate(
					{ authenticationData: Buffer.from('second') },
					(err) => {
						secondCallbackErr = err

						assert.ok(secondCallbackErr)
						assert.strictEqual(
							secondCallbackErr.message,
							'reauthenticate: a re-authentication is already in progress',
						)

						// Wait long enough for first reauth callback to complete
						setTimeout(() => {
							assert.ifError(firstCallbackErr)
							assert.ok(firstCallbackPacket)
							assert.strictEqual(
								firstCallbackPacket.reasonCode,
								0x00,
							)
							assert.strictEqual(authPacketCount, 1)
							client.end(true, () => testServer.close(done))
						}, 100)
					},
				)
			})
		})

		it(
			'should handle multi-step re-authentication (0x18 Continue)',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 29
				const authMethod = 'SCRAM-AUTH'
				const initialToken = Buffer.from('initial-token')
				const clientCredentials = Buffer.from('client-credentials')
				const serverChallenge = Buffer.from('server-challenge')
				const challengeResponse = Buffer.from('challenge-response')

				let authStep = 0

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () => {
						serverClient.connack({ reasonCode: 0 })
					})

					serverClient.on('auth', (packet) => {
						authStep++

						if (authStep === 1) {
							serverClient.auth({
								reasonCode: 0x18,
								properties: {
									authenticationMethod: authMethod,
									authenticationData: serverChallenge,
								},
							})
						} else if (authStep === 2) {
							serverClient.auth({ reasonCode: 0x00 })
						}
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: {
						authenticationMethod: authMethod,
						authenticationData: initialToken,
					},
				})

				client.handleAuth = (packet: IAuthPacket, callback) => {
					callback(null, {
						cmd: 'auth',
						reasonCode: 0x18,
						properties: {
							authenticationMethod: authMethod,
							authenticationData: challengeResponse,
						},
					})
				}

				client.on('connect', () => {
					client.reauthenticate(
						{ authenticationData: clientCredentials },
						(err, packet: IAuthPacket) => {
							assert.ifError(err)
							assert.strictEqual(packet.reasonCode, 0x00)
							assert.strictEqual(authStep, 2)
							client.end(true, () => testServer.close(done))
						},
					)
				})
			},
		)

		it(
			'should error if _sendPacket fails during reauthenticate',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 30

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () => {
						serverClient.connack({ reasonCode: 0 })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					reconnectPeriod: 0,
					properties: {
						authenticationMethod: 'test',
					},
				})

				client.once('connect', () => {
					const originalWritePacket = (client as any)._writePacket

					;(client as any)._writePacket = function (_packet, cb) {
						cb?.(new Error('simulated _writePacket failure'))
					}

					client.reauthenticate(
						{ authenticationData: Buffer.from('test') },
						(err) => {
							;(client as any)._writePacket = originalWritePacket

							assert.ok(err)
							assert.strictEqual(
								err.message,
								'simulated _writePacket failure',
							)

							client.end(true, () => testServer.close(done))
						},
					)
				})
			},
		)

		it(
			'should error if reauthenticate is called after client.end()',
			{ timeout: 15000 },
			function (t, done) {
				const port = ports.PORTAND327 + 31

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () => {
						serverClient.connack({ reasonCode: 0 })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					reconnectPeriod: 0,
					properties: {
						authenticationMethod: 'test',
					},
				})

				client.on('connect', () => {
					client.end()

					client.reauthenticate(
						{ authenticationData: Buffer.from('test') },
						(err) => {
							assert.ok(err)
							client.end(true, () => testServer.close(done))
						},
					)
				})
			},
		)

		it(
			'should error if reauthenticate times out',
			{ timeout: 5000 },
			function (t, done) {
				const port = ports.PORTAND327 + 32

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () => {
						serverClient.connack({ reasonCode: 0 })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					reauthTimeout: 200,
					properties: { authenticationMethod: 'test' },
				})

				client.on('connect', () => {
					client.reauthenticate(
						{ authenticationData: Buffer.from('test') },
						(err) => {
							assert.ok(err)
							assert.strictEqual(
								err.message,
								'reauthenticate: timed out',
							)
							client.end(true, () => testServer.close(done))
						},
					)
				})
			},
		)

		it(
			'should error if reauthenticate is called with null options',
			{ timeout: 5000 },
			function (t, done) {
				const port = ports.PORTAND327 + 33

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () =>
						serverClient.connack({ reasonCode: 0 }),
					)
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: { authenticationMethod: 'test' },
				})

				client.on('connect', () => {
					client.reauthenticate(null, (err) => {
						assert.ok(err)
						assert.strictEqual(
							err.message,
							'reauthenticate: reauthOptions is required',
						)
						client.end(true, () => testServer.close(done))
					})
				})
			},
		)

		it(
			'reauthenticateAsync resolves with the broker AUTH packet on success',
			{ timeout: 15000 },
			async function _test(t) {
				const port = ports.PORTAND327 + 34
				const newToken = Buffer.from('async-new-token')

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () => {
						serverClient.connack({ reasonCode: 0 })
					})

					serverClient.on('auth', (packet) => {
						assert.strictEqual(packet.reasonCode, 0x19)
						assert.ok(
							packet.properties.authenticationData.equals(
								newToken,
							),
						)
						serverClient.auth({ reasonCode: 0 })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: { authenticationMethod: 'test' },
				})

				await new Promise<void>((resolve) =>
					client.once('connect', () => resolve()),
				)

				const packet = await client.reauthenticateAsync({
					authenticationData: newToken,
				})

				assert.strictEqual(packet.reasonCode, 0)

				await new Promise<void>((resolve) =>
					client.end(true, () => testServer.close(() => resolve())),
				)
			},
		)

		it(
			'reauthenticateAsync rejects when broker returns a non-zero reason code',
			{ timeout: 15000 },
			async function _test(t) {
				const port = ports.PORTAND327 + 35
				const FAILING_RC = 0x19

				const testServer = serverBuilder('mqtt', (serverClient) => {
					serverClient.on('connect', () => {
						serverClient.connack({ reasonCode: 0 })
					})

					serverClient.on('auth', () => {
						serverClient.auth({ reasonCode: FAILING_RC })
					})
				}).listen(port)

				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					properties: { authenticationMethod: 'test' },
				})

				await new Promise<void>((resolve) =>
					client.once('connect', () => resolve()),
				)

				let error = false
				try {
					await client.reauthenticateAsync({
						authenticationData: Buffer.from('test'),
					})
				} catch (err) {
					error = true
					assert.isTrue(err.message.includes('Re-auth failed'))
				}

				assert.isTrue(error)

				await new Promise<void>((resolve) =>
					client.end(true, () => testServer.close(() => resolve())),
				)
			},
		)

		it('should emit error when validation fails without callback', function (t, done) {
			const port = ports.PORTAND327 + 36
			const testServer = serverBuilder('mqtt', (serverClient) => {
				serverClient.on('connect', () =>
					serverClient.connack({ reasonCode: 0 }),
				)
			}).listen(port)

			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				properties: { authenticationMethod: 'test' },
			})

			client.once('error', (err) => {
				assert.ok(err.message.includes('client is not connected'))
				testServer.close(done)
			})

			client.once('connect', () => {
				client.end(true, () => {
					client.reauthenticate({
						authenticationData: Buffer.from('test'),
					})
				})
			})
		})

		it('should error if reauthenticate is called without authenticationData', function (t, done) {
			const port = ports.PORTAND327 + 37
			const testServer = serverBuilder('mqtt', (serverClient) => {
				serverClient.on('connect', () =>
					serverClient.connack({ reasonCode: 0 }),
				)
			}).listen(port)

			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				properties: { authenticationMethod: 'test' },
			})

			client.on('connect', () => {
				client.reauthenticate(
					{}, // Empty object — missing authenticationData
					(err) => {
						assert.ok(err)
						assert.strictEqual(
							err.message,
							'reauthenticate: authenticationData is required',
						)
						client.end(true, () => testServer.close(done))
					},
				)
			})
		})

		it('should log error on timeout when no callback provided', function (t, done) {
			const port = ports.PORTAND327 + 38
			const testServer = serverBuilder('mqtt', (serverClient) => {
				serverClient.on('connect', () =>
					serverClient.connack({ reasonCode: 0 }),
				)
				// Broker never responds to AUTH — forces timeout
			}).listen(port)

			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reauthTimeout: 200,
				properties: { authenticationMethod: 'test' },
			})

			client.on('connect', () => {
				// No callback — _reauthCallback is undefined
				client.reauthenticate({
					authenticationData: Buffer.from('test'),
				})
			})

			// Wait for timeout to fire, then verify no crash
			setTimeout(() => {
				client.end(true, () => testServer.close(done))
			}, 400)
		})

		it('should cancel in-flight reauth when client.end() is called', function (t, done) {
			const port = ports.PORTAND327 + 39
			const testServer = serverBuilder('mqtt', (serverClient) => {
				serverClient.on('connect', () =>
					serverClient.connack({ reasonCode: 0 }),
				)
				serverClient.on('auth', () => {})
			}).listen(port)

			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reauthTimeout: 0,
				properties: { authenticationMethod: 'test' },
			})

			client.on('connect', () => {
				client.reauthenticate(
					{ authenticationData: Buffer.from('test') },
					(err) => {
						assert.ok(err)
						assert.ok(
							err.message.includes('cancelled by client.end()'),
						)
						client.end(true, () => testServer.close(done))
					},
				)

				setTimeout(() => client.end(), 50)
			})
		})
	})
})
