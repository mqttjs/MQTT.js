import { assert } from 'chai'
import { describe, it } from 'node:test'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import type { AddressInfo } from 'node:net'
import type { IPublishPacket } from 'mqtt-packet'
import { MqttServer } from './server'
import mqtt, { type MqttClient } from '../../src'

type ServerConnection = {
	index: number
	serverClient: any
	publishes: IPublishPacket[]
}

/**
 * A scripted MQTT 5 server that sends `receiveMaximum[n]` in the CONNACK of
 * its n-th connection (the last value for later ones), records every PUBLISH
 * and acks only what `onPublish` acks.
 */
async function startServer(
	receiveMaximum: number[],
	onPublish?: (conn: ServerConnection, packet: IPublishPacket) => void,
) {
	const connections: ServerConnection[] = []
	const server = new MqttServer((serverClient) => {
		const index = connections.length
		const conn: ServerConnection = { index, serverClient, publishes: [] }
		connections.push(conn)
		serverClient.on('connect', () => {
			serverClient.connack({
				reasonCode: 0,
				sessionPresent: index > 0,
				properties: {
					receiveMaximum:
						receiveMaximum[
							Math.min(index, receiveMaximum.length - 1)
						],
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
				await once(client, 'connect')
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
				await once(client, 'connect')
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
				await once(client, 'connect')
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
				await once(client, 'connect')
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
})
