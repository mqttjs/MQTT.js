import { assert } from 'chai'
import * as mqtt from '../src/mqtt'
import abstractClientTests from './abstract_client'
import { MqttServer } from './server'
import serverBuilder from './server_helpers_for_client_tests'
import ports from './helpers/port_list'
import { ErrorWithReasonCode } from '../src/lib/shared'

describe('MQTT 5.0', () => {
	const server = serverBuilder('mqtt').listen(ports.PORTAND115)
	const config = {
		protocol: 'mqtt',
		port: ports.PORTAND115,
		protocolVersion: 5,
		properties: { maximumPacketSize: 200 },
	}

	abstractClientTests(server, config)

	it('topic should be complemented on receive', function test(done) {
		this.timeout(15000)

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
	})

	it('registered topic alias should automatically used if autoUseTopicAlias is true', function test(done) {
		this.timeout(15000)

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
	})

	it('topicAlias is automatically used if autoAssignTopicAlias is true', function test(done) {
		this.timeout(15000)

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
	})

	it('topicAlias should be removed and topic restored on resend', function test(done) {
		this.timeout(15000)

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
	})

	it('topicAlias should be removed and topic restored on offline publish', function test(done) {
		this.timeout(15000)

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
	})

	it('should error cb call if PUBLISH out of range topicAlias', function test(done) {
		this.timeout(15000)

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
	})

	it('should error cb call if PUBLISH out of range topicAlias on topicAlias disabled by broker', function test(done) {
		this.timeout(15000)

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
	})

	it('should throw an error if broker PUBLISH out of range topicAlias', function test(done) {
		this.timeout(15000)

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
	})

	it('should throw an error if broker PUBLISH topicAlias:0', function test(done) {
		this.timeout(15000)

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
	})

	it('should throw an error if broker PUBLISH unregistered topicAlias', function test(done) {
		this.timeout(15000)

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
	})

	it('should throw an error if there is Auth Data with no Auth Method', function test(done) {
		this.timeout(5000)
		const opts: mqtt.IClientOptions = {
			host: 'localhost',
			port: ports.PORTAND115,
			protocolVersion: 5,
			properties: { authenticationData: Buffer.from([1, 2, 3, 4]) },
		}
		console.log('client connecting')
		const client = mqtt.connect(opts)
		client.on('error', (error) => {
			console.log('error hit')
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
	})

	it('auth packet', function test(done) {
		this.timeout(2500)
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
	})

	it('Maximum Packet Size', function test(done) {
		this.timeout(15000)
		const opts: mqtt.IClientOptions = {
			host: 'localhost',
			port: ports.PORTAND115,
			protocolVersion: 5,
			properties: { maximumPacketSize: 1 },
		}
		const client = mqtt.connect(opts)
		client.on('error', (error) => {
			assert.strictEqual(error.message, 'exceeding packets size connack')
			client.end(true, done)
		})
	})

	it('Change values of some properties by server response', function test(done) {
		this.timeout(15000)
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
			assert.strictEqual(client.options.properties.maximumPacketSize, 95)
			client.end(true, (err1) => {
				server2.close((err2) => {
					done(err1 || err2)
				})
			})
		})
	})

	it('should resubscribe when reconnecting with protocolVersion 5 and Session Present flag is false', function test(done) {
		this.timeout(15000)
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
	})

	it('should resubscribe when reconnecting with protocolVersion 5 and properties', function test(done) {
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
	})

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

	it('Subscribe properties', function test(done) {
		this.timeout(15000)
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
	})

	it('puback handling errors check', function test(done) {
		this.timeout(15000)
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
	})

	it('pubrec handling errors check', function test(done) {
		this.timeout(15000)
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
	})

	it('puback handling custom reason code', function test(done) {
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
	})

	it('server side disconnect', function test(done) {
		this.timeout(15000)
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
	})

	it('pubrec handling custom reason code', function test(done) {
		this.timeout(15000)
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
	})

	it('puback handling custom reason code with error', function test(done) {
		this.timeout(15000)
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
	})

	it('pubrec handling custom reason code with error', function test(done) {
		this.timeout(15000)
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
	})

	it('puback handling custom invalid reason code', function test(done) {
		this.timeout(15000)
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
			assert.strictEqual(error.message, 'Wrong reason code for puback')
			client.end(true, (err1) => {
				serverThatSendsErrors.close((err2) => {
					done(err1 || err2)
				})
			})
		})
		client.once('connect', () => {
			client.subscribe('a/b', { qos: 1 })
		})
	})

	it('pubrec handling custom invalid reason code', function test(done) {
		this.timeout(15000)
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
			assert.strictEqual(error.message, 'Wrong reason code for pubrec')
			client.end(true, (err1) => {
				serverThatSendsErrors.close((err2) => {
					done(err1 || err2)
				})
			})
		})
		client.once('connect', () => {
			client.subscribe('a/b', { qos: 1 })
		})
	})
})
