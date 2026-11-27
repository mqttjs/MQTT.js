import { assert } from 'chai'
import { describe, it } from 'node:test'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import net, { type AddressInfo } from 'node:net'
import type { IPublishPacket } from 'mqtt-packet'
import { MqttServer } from './server'
import mqtt, { Store, type MqttClient } from '../../src'

type ServerConnection = {
	index: number
	serverClient: any
	publishes: IPublishPacket[]
}

/**
 * A scripted MQTT 5 server that sends `receiveMaximum[n]` (none if undefined, plus
 * `connackProperties`) in the CONNACK of its n-th connection (the last value
 * for later ones), records every PUBLISH and acks only what `onPublish` acks.
 * Session Present is set from the second connection on, unless `sessionPresent` says otherwise.
 */
async function startServer(
	receiveMaximum: (number | undefined)[],
	onPublish?: (conn: ServerConnection, packet: IPublishPacket) => void,
	{
		connackProperties = {},
		sessionPresent,
	}: {
		connackProperties?: Record<string, number>
		sessionPresent?: boolean
	} = {},
) {
	const connections: ServerConnection[] = []
	const server = new MqttServer((serverClient) => {
		const index = connections.length
		const conn: ServerConnection = { index, serverClient, publishes: [] }
		connections.push(conn)
		serverClient.on('connect', () => {
			const max =
				receiveMaximum[Math.min(index, receiveMaximum.length - 1)]
			serverClient.connack({
				reasonCode: 0,
				// what a 3.1.1 CONNACK is encoded from
				returnCode: 0,
				sessionPresent: sessionPresent ?? index > 0,
				properties: {
					...connackProperties,
					// undefined would not encode: leave the property out
					...(max === undefined ? {} : { receiveMaximum: max }),
				},
			})
		})
		serverClient.on('publish', (packet: IPublishPacket) => {
			conn.publishes.push(packet)
			onPublish?.(conn, packet)
		})
		serverClient.on('error', () => {})
	})
	server.listen(0)
	await once(server, 'listening')
	const { port } = server.address() as AddressInfo
	return { server, port, connections }
}

async function waitFor(condition: () => boolean, what: string) {
	for (let i = 0; i < 200; i++) {
		if (condition()) return
		await delay(10)
	}
	throw new Error(`timed out waiting for ${what}`)
}

// MqttClient is a typed emitter, which `events.once` does not accept
function connected(client: MqttClient) {
	return new Promise<void>((resolve) => {
		client.once('connect', () => resolve())
	})
}

/** Lets the client write anything it was going to write. */
const settle = () => delay(100)

async function teardown(client: MqttClient, server: MqttServer) {
	await new Promise<void>((resolve) => {
		client.end(true, () => resolve())
	})
	server.connectionList.forEach((socket) => socket.destroy())
	server.close()
}

const topics = (publishes: IPublishPacket[]) =>
	publishes.map((p) => p.topic.toString())

const testOptions = { timeout: 10000 }

// MQTT 5.0 section 4.9, MQTT-3.3.4-7
describe('MQTT 5.0 send quota (server Receive Maximum)', () => {
	it(
		'sends no more QoS 1 publishes than the Receive Maximum, and the next one on each PUBACK',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([2])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const done: string[] = []
				const results = [0, 1, 2, 3, 4].map(
					(i) =>
						new Promise<void>((resolve, reject) => {
							client.publish(
								`rm/${i}`,
								'x',
								{ qos: 1 },
								(err) => {
									if (err) return reject(err)
									done.push(`rm/${i}`)
									resolve()
								},
							)
						}),
				)

				await settle()
				assert.deepEqual(topics(conn.publishes), ['rm/0', 'rm/1'])

				conn.serverClient.puback({
					messageId: conn.publishes[0].messageId,
				})
				await waitFor(() => conn.publishes.length === 3, '3rd PUBLISH')
				await settle()
				assert.deepEqual(topics(conn.publishes), [
					'rm/0',
					'rm/1',
					'rm/2',
				])

				// ack the rest one by one, as they arrive
				for (let i = 1; i < 5; i++) {
					await waitFor(
						() => conn.publishes.length > i,
						`PUBLISH ${i}`,
					)
					conn.serverClient.puback({
						messageId: conn.publishes[i].messageId,
					})
				}
				await Promise.all(results)
				assert.deepEqual(done, ['rm/0', 'rm/1', 'rm/2', 'rm/3', 'rm/4'])
				assert.deepEqual(topics(conn.publishes), done)
				// held publishes were never sent, so they go out with DUP 0
				assert.isTrue(conn.publishes.every((p) => !p.dup))
				assert.deepEqual(client.outgoing, {})
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'does not hold QoS 0 publishes when the send quota is used up',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				client.publish('rm/q1-a', 'x', { qos: 1 })
				client.publish('rm/q1-b', 'x', { qos: 1 })
				client.publish('rm/q0', 'x', { qos: 0 })
				await settle()
				assert.deepEqual(topics(connections[0].publishes), [
					'rm/q1-a',
					'rm/q0',
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'keeps a QoS 2 slot until PUBCOMP, and frees it on a PUBREC >= 0x80',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const pubrels: number[] = []
				conn.serverClient.on('pubrel', (packet) => {
					pubrels.push(packet.messageId)
				})
				const errors: (Error | undefined)[] = []
				const results = ['rm/a', 'rm/b', 'rm/c'].map(
					(topic) =>
						new Promise<void>((resolve) => {
							client.publish(topic, 'x', { qos: 2 }, (err) => {
								errors.push(err)
								resolve()
							})
						}),
				)

				await settle()
				assert.deepEqual(topics(conn.publishes), ['rm/a'])

				// a successful PUBREC keeps the slot until PUBCOMP
				const idA = conn.publishes[0].messageId
				conn.serverClient.pubrec({ messageId: idA })
				await waitFor(() => pubrels.length === 1, 'PUBREL')
				await settle()
				assert.deepEqual(topics(conn.publishes), ['rm/a'])

				conn.serverClient.pubcomp({ messageId: idA })
				await waitFor(() => conn.publishes.length === 2, 'rm/b')

				// a failed PUBREC ends the flow and frees the slot
				conn.serverClient.pubrec({
					messageId: conn.publishes[1].messageId,
					reasonCode: 0x80,
				})
				await waitFor(() => conn.publishes.length === 3, 'rm/c')
				assert.deepEqual(topics(conn.publishes), [
					'rm/a',
					'rm/b',
					'rm/c',
				])

				conn.serverClient.pubrec({
					messageId: conn.publishes[2].messageId,
				})
				await waitFor(() => pubrels.length === 2, 'PUBREL rm/c')
				conn.serverClient.pubcomp({
					messageId: conn.publishes[2].messageId,
				})
				await Promise.all(results)
				assert.isNotOk(errors[0])
				assert.match(errors[1]?.message, /Unspecified error/)
				assert.isNotOk(errors[2])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'restarts the send quota from the CONNACK of a new connection and delivers the held publishes',
		testOptions,
		async () => {
			// the 2nd connection acks all but the `rm/held` publishes
			const { server, port, connections } = await startServer(
				[1, 3],
				(conn, packet) => {
					if (
						conn.index > 0 &&
						!packet.topic.toString().startsWith('rm/held')
					) {
						conn.serverClient.puback({
							messageId: packet.messageId,
						})
					}
				},
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				clean: false,
				clientId: 'receive-maximum-reconnect',
				reconnectPeriod: 50,
			})
			try {
				await connected(client)
				const done: string[] = []
				const publishAll = (names: string[]) =>
					names.map(
						(topic) =>
							new Promise<void>((resolve, reject) => {
								client.publish(
									topic,
									'x',
									{ qos: 1 },
									(err) => {
										if (err) return reject(err)
										done.push(topic)
										resolve()
									},
								)
							}),
					)

				const first = publishAll(['rm/a', 'rm/b', 'rm/c'])
				await settle()
				assert.deepEqual(topics(connections[0].publishes), ['rm/a'])

				// drop the connection with the quota used up
				connections[0].serverClient.destroy()
				await waitFor(() => connections.length === 2, 'reconnect')
				const conn2 = connections[1]
				await Promise.all(first)
				assert.deepEqual(done, ['rm/a', 'rm/b', 'rm/c'])
				assert.deepEqual(topics(conn2.publishes), [
					'rm/a',
					'rm/b',
					'rm/c',
				])

				// the new CONNACK allows 3 in flight
				publishAll(['rm/held-1', 'rm/held-2', 'rm/held-3', 'rm/held-4'])
				await settle()
				assert.deepEqual(topics(conn2.publishes).slice(3), [
					'rm/held-1',
					'rm/held-2',
					'rm/held-3',
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'with clean: true, sends the sent and the held publishes again on the reconnect, each once',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer(
				[1, 3],
				(conn, packet) => {
					if (conn.index > 0) {
						conn.serverClient.puback({
							messageId: packet.messageId,
						})
					}
				},
				{ sessionPresent: false },
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				clean: true,
				reconnectPeriod: 50,
			})
			try {
				await connected(client)
				const results: Record<string, Error | null> = {}
				for (const topic of ['rm/a', 'rm/b', 'rm/c']) {
					client.publish(topic, 'x', { qos: 1 }, (err) => {
						results[topic] = err ?? null
					})
				}
				await waitFor(
					() => connections[0].publishes.length === 1,
					'rm/a',
				)
				connections[0].serverClient.destroy()
				await waitFor(
					() => Object.keys(results).length === 3,
					'the callbacks',
				)
				assert.deepEqual(results, {
					'rm/a': null,
					'rm/b': null,
					'rm/c': null,
				})
				assert.deepEqual(topics(connections[1].publishes), [
					'rm/a',
					'rm/b',
					'rm/c',
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'frees the slot of a QoS 1 publish on a PUBACK >= 0x80',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const refused = new Promise<Error | undefined>((resolve) => {
					client.publish('rm/refused', 'x', { qos: 1 }, (err) =>
						resolve(err),
					)
				})
				client.publish('rm/next', 'x', { qos: 1 })
				await waitFor(() => conn.publishes.length === 1, 'rm/refused')
				conn.serverClient.puback({
					messageId: conn.publishes[0].messageId,
					reasonCode: 0x80,
				})
				assert.match(
					(await refused)?.message ?? '',
					/Unspecified error/,
				)
				await waitFor(() => conn.publishes.length === 2, 'rm/next')
				assert.deepEqual(topics(conn.publishes), [
					'rm/refused',
					'rm/next',
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'sends a held alias-only publish on the topic its alias had at publish time',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer(
				[1],
				undefined,
				{ connackProperties: { topicAliasMaximum: 5 } },
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const props = { topicAlias: 1 }
				// registers alias 1 -> rm/x and takes the only slot
				client.publish('rm/x', 'first', { qos: 1, properties: props })
				await waitFor(() => conn.publishes.length === 1, 'rm/x')
				// held: alias 1 is rm/x now
				client.publish('', 'held', { qos: 1, properties: props })
				// written at once, remaps alias 1 to rm/z
				client.publish('rm/z', 'qos0', { qos: 0, properties: props })
				await waitFor(() => conn.publishes.length === 2, 'rm/z')
				conn.serverClient.puback({
					messageId: conn.publishes[0].messageId,
				})
				await waitFor(() => conn.publishes.length === 3, 'the held one')
				const held = conn.publishes[2]
				assert.strictEqual(held.payload.toString(), 'held')
				assert.strictEqual(held.topic.toString(), 'rm/x')
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'keeps app-set aliases in publish order when QoS 0 publishes overtake held ones',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer(
				[1],
				undefined,
				{ connackProperties: { topicAliasMaximum: 5 } },
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const alias = (topicAlias: number) => ({
					properties: { topicAlias },
				})
				client.publish('rm/first', 'first', { qos: 1 })
				await waitFor(() => conn.publishes.length === 1, 'rm/first')
				// held, maps alias 1 to rm/a
				client.publish('rm/a', 'held-a', { qos: 1, ...alias(1) })
				// written at once, remaps alias 1 to rm/b
				client.publish('rm/b', 'qos0-b', { qos: 0, ...alias(1) })
				// held, maps alias 2 to rm/c
				client.publish('rm/c', 'held-c', { qos: 1, ...alias(2) })
				// written at once, before the held publish that sets alias 2
				client.publish('', 'qos0-c', { qos: 0, ...alias(2) })
				await waitFor(
					() => conn.publishes.length === 3,
					'the QoS 0 ones',
				)
				const qos1 = () => conn.publishes.filter((p) => p.qos > 0)
				for (let i = 0; i < 3; i++) {
					await waitFor(() => qos1().length > i, `QoS 1 publish ${i}`)
					conn.serverClient.puback({ messageId: qos1()[i].messageId })
				}
				await waitFor(
					() => conn.publishes.length === 5,
					'the held ones',
				)
				// alias 1 was last given rm/b in publish order
				client.publish('', 'qos0-b-again', { qos: 0, ...alias(1) })
				await waitFor(() => conn.publishes.length === 6, 'qos0-b-again')

				// the topic each payload reaches, replaying the aliases in wire order
				const wire = new Map<number, string>()
				const delivered = conn.publishes.map((p) => {
					const a = p.properties?.topicAlias
					const topic = p.topic.toString()
					if (a && topic) wire.set(a, topic)
					return [p.payload.toString(), topic || wire.get(a)]
				})
				assert.deepEqual(Object.fromEntries(delivered), {
					first: 'rm/first',
					'held-a': 'rm/a',
					'qos0-b': 'rm/b',
					'held-c': 'rm/c',
					'qos0-c': 'rm/c',
					'qos0-b-again': 'rm/b',
				})
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'sends an alias-only QoS 1 publish that is not held without its topic',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer(
				[2],
				undefined,
				{ connackProperties: { topicAliasMaximum: 5 } },
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const props = { properties: { topicAlias: 1 } }
				client.publish('rm/x', 'set', { qos: 1, ...props })
				// takes the second slot at once: the alias saves the topic bytes
				client.publish('', 'use', { qos: 1, ...props })
				await waitFor(() => conn.publishes.length === 2, '2 PUBLISH')
				assert.deepEqual(topics(conn.publishes), ['rm/x', ''])
				assert.strictEqual(conn.publishes[1].properties?.topicAlias, 1)
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'never writes a held publish that removeOutgoingMessage removed',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				client.publish('rm/a', 'x', { qos: 1 })
				const removed = new Promise<Error | undefined>((resolve) => {
					client.publish('rm/removed', 'x', { qos: 1 }, (err) =>
						resolve(err),
					)
				})
				const removedId = client.getLastMessageId()
				const next = new Promise<void>((resolve) => {
					client.publish('rm/next', 'x', { qos: 1 }, () => resolve())
				})
				await waitFor(() => conn.publishes.length === 1, 'rm/a')
				client.removeOutgoingMessage(removedId)
				assert.match((await removed)?.message ?? '', /Message removed/)
				conn.serverClient.puback({
					messageId: conn.publishes[0].messageId,
				})
				await waitFor(() => conn.publishes.length === 2, 'rm/next')
				conn.serverClient.puback({
					messageId: conn.publishes[1].messageId,
				})
				await next
				assert.deepEqual(topics(conn.publishes), ['rm/a', 'rm/next'])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'frees the slot of an in-flight publish that removeOutgoingMessage removed',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				client.publish('rm/removed', 'x', { qos: 1 })
				const removedId = client.getLastMessageId()
				client.publish('rm/next', 'x', { qos: 1 })
				await waitFor(() => conn.publishes.length === 1, 'rm/removed')
				client.removeOutgoingMessage(removedId)
				// no PUBACK: removing it frees its slot
				await waitFor(() => conn.publishes.length === 2, 'rm/next')
				assert.deepEqual(topics(conn.publishes), [
					'rm/removed',
					'rm/next',
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'frees the slot of a publish that fails after taking it',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				// the server sent no Topic Alias Maximum, so any alias fails
				const failed = new Promise<Error | undefined>((resolve) => {
					client.publish(
						'rm/bad-alias',
						'x',
						{ qos: 1, properties: { topicAlias: 1 } },
						(err) => resolve(err),
					)
				})
				client.publish('rm/next', 'x', { qos: 1 })
				assert.match(
					(await failed)?.message ?? '',
					/Topic Alias out of range/,
				)
				await waitFor(
					() => connections[0].publishes.length === 1,
					'rm/next',
				)
				assert.deepEqual(topics(connections[0].publishes), ['rm/next'])
				assert.deepEqual(Object.keys(client.outgoing), [
					String(connections[0].publishes[0].messageId),
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'frees the slot of a publish whose topic alias is not registered',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer(
				[1],
				undefined,
				{ connackProperties: { topicAliasMaximum: 5 } },
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				// an empty topic needs a registered alias to recover it from
				const failed = new Promise<Error | undefined>((resolve) => {
					client.publish(
						'',
						'x',
						{ qos: 1, properties: { topicAlias: 3 } },
						(err) => resolve(err),
					)
				})
				client.publish('rm/next', 'x', { qos: 1 })
				assert.match(
					(await failed)?.message ?? '',
					/Unregistered Topic Alias/,
				)
				await waitFor(
					() => connections[0].publishes.length === 1,
					'rm/next',
				)
				assert.deepEqual(topics(connections[0].publishes), ['rm/next'])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'checks a held publish against the CONNACK limits when it is written, and frees its slot when refused',
		testOptions,
		async () => {
			// 130 bytes fit the first `long` publish with its topic, the second only by alias
			const { server, port, connections } = await startServer(
				[1],
				undefined,
				{
					connackProperties: {
						topicAliasMaximum: 1,
						maximumPacketSize: 130,
					},
				},
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				autoAssignTopicAlias: true,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const long = `rm/${'l'.repeat(97)}`
				client.publish(long, 'x', { qos: 1 })
				// held while `long` has the alias, so it fits when queued
				const refused = new Promise<Error | undefined>((resolve) => {
					client.publish(long, 'x'.repeat(50), { qos: 1 }, (err) =>
						resolve(err),
					)
				})
				// QoS 0 is not held: it takes the only alias from `long`
				client.publish('rm/qos0', 'x', { qos: 0 })
				client.publish('rm/next', 'x', { qos: 1 })
				await settle()
				assert.deepEqual(topics(conn.publishes), [long, 'rm/qos0'])

				conn.serverClient.puback({
					messageId: conn.publishes[0].messageId,
				})
				assert.match(
					(await refused)?.message ?? '',
					/exceeds the server Maximum Packet Size 130/,
				)
				await waitFor(() => conn.publishes.length === 3, 'rm/next')
				assert.deepEqual(topics(conn.publishes), [
					long,
					'rm/qos0',
					'rm/next',
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'does not limit publishes when the CONNACK has no Receive Maximum',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([undefined])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				for (let i = 0; i < 20; i++) {
					client.publish(`rm/${i}`, 'x', { qos: 1 })
				}
				await waitFor(
					() => connections[0].publishes.length === 20,
					'20 PUBLISH packets',
				)
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'closes the connection when the CONNACK has Receive Maximum 0',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([0])
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			const closed = new Promise<void>((resolve) => {
				client.once('close', () => resolve())
			})
			try {
				const err = await new Promise<Error>((resolve) => {
					client.once('error', resolve)
				})
				assert.match(err.message, /invalid Receive Maximum 0/)
				assert.strictEqual((err as mqtt.ErrorWithReasonCode).code, 130)
				await closed
				client.publish('rm/never', 'x', { qos: 1 })
				await settle()
				assert.lengthOf(connections[0].publishes, 0)
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'closes the connection when the CONNACK repeats Receive Maximum',
		testOptions,
		async () => {
			// mqtt-packet cannot encode a repeated property: send the bytes.
			// CONNACK, accepted, properties: Receive Maximum 5, Receive Maximum 1
			const connack = Buffer.from([
				0x20, 9, 0, 0, 6, 0x21, 0, 5, 0x21, 0, 1,
			])
			const server = net.createServer((socket) => {
				socket.once('data', () => socket.write(connack))
				socket.on('error', () => {})
			})
			server.listen(0)
			await once(server, 'listening')
			const { port } = server.address() as AddressInfo
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			const closed = new Promise<void>((resolve) => {
				client.once('close', () => resolve())
			})
			try {
				const err = await new Promise<Error>((resolve) => {
					client.once('error', resolve)
				})
				assert.match(err.message, /invalid Receive Maximum \[5,1\]/)
				assert.strictEqual((err as mqtt.ErrorWithReasonCode).code, 130)
				await closed
			} finally {
				client.end(true)
				server.close()
			}
		},
	)

	it(
		'stores a held alias-only publish under the topic a publish held before it sets',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer(
				[1],
				undefined,
				{ connackProperties: { topicAliasMaximum: 5 } },
			)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const conn = connections[0]
				const errors: (Error | undefined)[] = []
				const done = (err?: Error) => errors.push(err)
				client.publish('rm/first', 'x', { qos: 1 }, done)
				client.publish(
					'rm/aliased',
					'x',
					{ qos: 1, properties: { topicAlias: 1 } },
					done,
				)
				client.publish(
					'',
					'x',
					{ qos: 1, properties: { topicAlias: 1 } },
					done,
				)
				const thirdId = client.getLastMessageId()
				await waitFor(() => conn.publishes.length === 1, 'rm/first')
				const third = await new Promise<IPublishPacket>(
					(resolve, reject) => {
						client.outgoingStore.get(
							{ messageId: thirdId },
							(err, packet) =>
								err
									? reject(err)
									: resolve(packet as IPublishPacket),
						)
					},
				)
				// stored with its topic, so a replay goes to the right place
				assert.strictEqual(third.topic, 'rm/aliased')
				for (let i = 0; i < 3; i++) {
					await waitFor(
						() => conn.publishes.length > i,
						`PUBLISH ${i}`,
					)
					conn.serverClient.puback({
						messageId: conn.publishes[i].messageId,
					})
				}
				await waitFor(() => errors.length === 3, 'the callbacks')
				assert.deepEqual(errors, [null, null, null])
				// sent with its topic, resolved when it was held
				assert.deepEqual(topics(conn.publishes), [
					'rm/first',
					'rm/aliased',
					'rm/aliased',
				])
			} finally {
				await teardown(client, server)
			}
		},
	)

	it(
		'fails a held publish the store fails to put, once, and never sends it',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const outgoingStore = new Store()
			const put = outgoingStore.put.bind(outgoingStore)
			outgoingStore.put = (packet, cb) => {
				if ((packet as IPublishPacket).topic === 'rm/unstored') {
					cb(new Error('put failed'))
					return outgoingStore
				}
				return put(packet, cb)
			}
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				outgoingStore,
			})
			try {
				await connected(client)
				const conn = connections[0]
				client.publish('rm/first', 'x', { qos: 1 })
				const errors: (Error | undefined)[] = []
				client.publish('rm/unstored', 'x', { qos: 1 }, (err) => {
					errors.push(err)
				})
				const next = new Promise<void>((resolve) => {
					client.publish('rm/next', 'x', { qos: 1 }, () => resolve())
				})
				await waitFor(() => conn.publishes.length === 1, 'rm/first')
				conn.serverClient.puback({
					messageId: conn.publishes[0].messageId,
				})
				await waitFor(() => conn.publishes.length === 2, 'rm/next')
				conn.serverClient.puback({
					messageId: conn.publishes[1].messageId,
				})
				await next
				assert.deepEqual(topics(conn.publishes), [
					'rm/first',
					'rm/next',
				])
				assert.lengthOf(errors, 1)
				assert.match(errors[0]?.message ?? '', /put failed/)
				assert.deepEqual(client.outgoing, {})
			} finally {
				await teardown(client, server)
			}
		},
	)

	// weak by construction: a 3.1.1 CONNACK has no properties to set a limit
	it('does not limit MQTT 3.1.1 publishes', testOptions, async () => {
		// a 3.1.1 CONNACK carries no properties, so the server sends no limit
		const { server, port, connections } = await startServer([1])
		const client = mqtt.connect({
			port,
			protocolVersion: 4,
			reconnectPeriod: 0,
		})
		try {
			await connected(client)
			for (let i = 0; i < 5; i++) {
				client.publish(`rm/${i}`, 'x', { qos: 1 })
			}
			await waitFor(
				() => connections[0].publishes.length === 5,
				'5 PUBLISH packets',
			)
		} finally {
			await teardown(client, server)
		}
	})

	it(
		'frees the slot of a publish the store fails to put',
		testOptions,
		async () => {
			const { server, port, connections } = await startServer([1])
			const outgoingStore = new Store()
			const put = outgoingStore.put.bind(outgoingStore)
			let failNext = true
			outgoingStore.put = (packet, cb) => {
				if (failNext) {
					failNext = false
					cb(new Error('put failed'))
					return outgoingStore
				}
				return put(packet, cb)
			}
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				outgoingStore,
			})
			try {
				await connected(client)
				// never written, so it must not keep the only slot
				const failed = new Promise<Error | undefined>((resolve) => {
					client.publish('rm/unstored', 'x', { qos: 1 }, (err) =>
						resolve(err),
					)
				})
				client.publish('rm/next', 'x', { qos: 1 })
				assert.match((await failed)?.message ?? '', /put failed/)
				await waitFor(
					() => connections[0].publishes.length === 1,
					'rm/next',
				)
				assert.deepEqual(topics(connections[0].publishes), ['rm/next'])
			} finally {
				await teardown(client, server)
			}
		},
	)
})
