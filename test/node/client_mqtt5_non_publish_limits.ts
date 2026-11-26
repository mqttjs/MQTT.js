import { assert } from 'chai'
import { describe, it } from 'node:test'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type {
	IAuthPacket,
	IConnackPacket,
	IDisconnectPacket,
	ISubscribePacket,
	IUnsubscribePacket,
	Packet,
} from 'mqtt-packet'
import { MqttServer, type MqttServerListener } from './server'
import mqtt, { UniqueMessageIdProvider, type MqttClient } from '../../src'

type ServerClient = Parameters<MqttServerListener>[0]

/**
 * A scripted MQTT 5 server that answers CONNECT with `properties` and records
 * every SUBSCRIBE, UNSUBSCRIBE, DISCONNECT and AUTH it receives.
 */
async function startServer(
	properties: IConnackPacket['properties'],
	afterConnack?: (serverClient: ServerClient) => void,
) {
	const received: Packet[] = []
	const server = new MqttServer((serverClient) => {
		serverClient.on('connect', () => {
			serverClient.connack({
				reasonCode: 0,
				sessionPresent: false,
				properties,
			})
			afterConnack?.(serverClient)
		})
		serverClient.on('subscribe', (packet: ISubscribePacket) => {
			received.push(packet)
			serverClient.suback({
				messageId: packet.messageId,
				granted: packet.subscriptions.map((sub) => sub.qos),
			})
		})
		serverClient.on('unsubscribe', (packet: IUnsubscribePacket) => {
			received.push(packet)
			serverClient.unsuback({
				messageId: packet.messageId,
				granted: packet.unsubscriptions.map(() => 0),
			})
		})
		serverClient.on('disconnect', (packet: IDisconnectPacket) => {
			received.push(packet)
		})
		serverClient.on('auth', (packet: IAuthPacket) => {
			received.push(packet)
		})
		serverClient.on('error', () => {})
	})
	server.listen(0)
	await once(server, 'listening')
	const { port } = server.address() as AddressInfo
	return { server, port, received }
}

// MqttClient is a typed emitter, which `events.once` does not accept
function connected(client: MqttClient) {
	return new Promise<void>((resolve) => {
		client.once('connect', () => resolve())
	})
}

async function stop(client: MqttClient, server: MqttServer) {
	await new Promise<void>((resolve) => {
		client.end(true, () => resolve())
	})
	server.close()
}

// a refused call whose callback never comes must fail, not hang
const testOptions = { timeout: 5000 }

async function waitFor<T>(check: () => T | undefined, what: string) {
	for (let i = 0; i < 500; i++) {
		const value = check()
		if (value !== undefined) {
			return value
		}
		await new Promise((resolve) => {
			setTimeout(resolve, 10)
		})
	}
	throw new Error(`timeout waiting for ${what}`)
}

describe('MQTT 5.0 outgoing non-PUBLISH limits from CONNACK', () => {
	it(
		'refuses a SUBSCRIBE over the server Maximum Packet Size (MQTT-3.2.2-15)',
		testOptions,
		async () => {
			const { server, port, received } = await startServer({
				maximumPacketSize: 64,
			})
			const messageIdProvider = new UniqueMessageIdProvider()
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				messageIdProvider,
			})
			try {
				await connected(client)

				const err = await new Promise<Error | undefined>((resolve) => {
					client.subscribe(
						'limits/refused',
						{
							qos: 1,
							properties: {
								userProperties: { a: 'x'.repeat(300) },
							},
						},
						(subscribeErr) => resolve(subscribeErr),
					)
				})
				assert.match(
					err?.message,
					/Subscribe refused: packet size \d+ exceeds the server Maximum Packet Size 64/,
				)
				const refusedId = client.getLastMessageId()
				assert.deepEqual(client.outgoing, {}, 'outgoing entry removed')
				assert.isTrue(
					messageIdProvider.register(refusedId),
					'message id freed',
				)
				messageIdProvider.deallocate(refusedId)
				assert.deepEqual(
					client['_resubscribeTopics'],
					{},
					'the subscription is not resubscribed after a reconnect',
				)
				assert.deepEqual(client.messageIdToTopic, {})

				// the connection is still up and takes a valid subscribe
				const granted = await new Promise<Error | undefined>(
					(resolve) => {
						client.subscribe(
							'limits/ok',
							{ qos: 1 },
							(subscribeErr) => resolve(subscribeErr),
						)
					},
				)
				assert.isNotOk(granted)
				assert.isTrue(client.connected)
				const topicOf = (packet: Packet) =>
					(packet as ISubscribePacket).subscriptions[0].topic
				assert.deepEqual(
					received.map(topicOf),
					['limits/ok'],
					'the refused SUBSCRIBE never reached the server',
				)
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'refuses an UNSUBSCRIBE over the server Maximum Packet Size (MQTT-3.2.2-15)',
		testOptions,
		async () => {
			const { server, port, received } = await startServer({
				maximumPacketSize: 64,
			})
			const messageIdProvider = new UniqueMessageIdProvider()
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				messageIdProvider,
			})
			try {
				await connected(client)

				const topics = Array.from(
					{ length: 10 },
					(_, i) => `limits/refused/topic/name/number/${i}`,
				)
				const err = await new Promise<Error | undefined>((resolve) => {
					client.unsubscribe(topics, (unsubscribeErr) =>
						resolve(unsubscribeErr),
					)
				})
				assert.match(
					err?.message,
					/Unsubscribe refused: packet size \d+ exceeds the server Maximum Packet Size 64/,
				)
				const refusedId = client.getLastMessageId()
				assert.deepEqual(client.outgoing, {}, 'outgoing entry removed')
				assert.isTrue(
					messageIdProvider.register(refusedId),
					'message id freed',
				)
				messageIdProvider.deallocate(refusedId)

				// the connection is still up and takes a valid unsubscribe
				const okErr = await new Promise<Error | undefined>(
					(resolve) => {
						client.unsubscribe('limits/ok', (unsubscribeErr) =>
							resolve(unsubscribeErr),
						)
					},
				)
				assert.isNotOk(okErr)
				assert.isTrue(client.connected)
				const unsubscriptionsOf = (packet: Packet) =>
					(packet as IUnsubscribePacket).unsubscriptions
				assert.deepEqual(
					received.map(unsubscriptionsOf),
					[['limits/ok']],
					'the refused UNSUBSCRIBE never reached the server',
				)
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'checks a subscribe queued offline against the CONNACK it goes out on',
		testOptions,
		async () => {
			const { server, port, received } = await startServer({
				maximumPacketSize: 64,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				// sent before the CONNACK: queued, then checked when it goes out
				const err = await new Promise<Error | undefined>((resolve) => {
					client.subscribe(
						'limits/refused',
						{
							qos: 1,
							properties: {
								userProperties: { a: 'x'.repeat(300) },
							},
						},
						(subscribeErr) => resolve(subscribeErr),
					)
				})
				assert.match(
					err?.message,
					/Subscribe refused: packet size \d+ exceeds the server Maximum Packet Size 64/,
				)

				// the queue is not stalled: a valid subscribe goes through
				const granted = await new Promise<Error | undefined>(
					(resolve) => {
						client.subscribe(
							'limits/ok',
							{ qos: 1 },
							(subscribeErr) => resolve(subscribeErr),
						)
					},
				)
				assert.isNotOk(granted)
				const topicOf = (packet: Packet) =>
					(packet as ISubscribePacket).subscriptions[0].topic
				assert.deepEqual(
					received.map(topicOf),
					['limits/ok'],
					'the refused SUBSCRIBE never reached the server',
				)
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'sends a SUBSCRIBE exactly at the server Maximum Packet Size',
		testOptions,
		async () => {
			// 1 (fixed header) + 1 (remaining length) + 2 (message id)
			// + 1 (property length) + 2 + 5 (topic) + 1 (options) = 13
			const { server, port, received } = await startServer({
				maximumPacketSize: 13,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const granted = await new Promise<Error | undefined>(
					(resolve) => {
						client.subscribe('big/t', { qos: 1 }, (subscribeErr) =>
							resolve(subscribeErr),
						)
					},
				)
				assert.isNotOk(granted)
				assert.strictEqual(received.length, 1)
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'sends an UNSUBSCRIBE exactly at the server Maximum Packet Size',
		testOptions,
		async () => {
			// 1 (fixed header) + 1 (remaining length) + 2 (message id)
			// + 1 (property length) + 2 + 5 (topic) = 12
			const { server, port, received } = await startServer({
				maximumPacketSize: 12,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				const err = await new Promise<Error | undefined>((resolve) => {
					client.unsubscribe('big/t', (unsubscribeErr) =>
						resolve(unsubscribeErr),
					)
				})
				assert.isNotOk(err)
				assert.strictEqual(received.length, 1)
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'drops the Reason String and the User Properties of a DISCONNECT over the server Maximum Packet Size (MQTT-3.14.2-2, -3)',
		testOptions,
		async () => {
			const { server, port, received } = await startServer({
				maximumPacketSize: 64,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				await new Promise<void>((resolve) => {
					client.end(
						{
							reasonCode: 0,
							properties: {
								reasonString: 'x'.repeat(300),
								userProperties: { a: 'y'.repeat(300) },
							},
						},
						() => resolve(),
					)
				})
				// the DISCONNECT still goes out: it is part of the protocol flow
				const packet = (await waitFor(
					() => received[0] as IDisconnectPacket | undefined,
					'the DISCONNECT to reach the server',
				)) as IDisconnectPacket
				assert.strictEqual(packet.cmd, 'disconnect')
				assert.strictEqual(packet.reasonCode, 0, 'reason code kept')
				assert.isNotOk(packet.properties?.reasonString)
				assert.isNotOk(packet.properties?.userProperties)
			} finally {
				server.close()
			}
		},
	)

	it(
		'keeps the Reason String and the User Properties of a DISCONNECT under the server Maximum Packet Size',
		testOptions,
		async () => {
			const { server, port, received } = await startServer({
				maximumPacketSize: 64,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				await new Promise<void>((resolve) => {
					client.end(
						{
							reasonCode: 0,
							properties: {
								reasonString: 'bye',
								userProperties: { a: 'ok' },
							},
						},
						() => resolve(),
					)
				})
				const packet = (await waitFor(
					() => received[0] as IDisconnectPacket | undefined,
					'the DISCONNECT to reach the server',
				)) as IDisconnectPacket
				assert.strictEqual(packet.cmd, 'disconnect')
				assert.strictEqual(packet.properties?.reasonString, 'bye')
				assert.deepEqual(packet.properties?.userProperties, {
					a: 'ok',
				})
			} finally {
				server.close()
			}
		},
	)

	const authTests: {
		name: string
		userProperties: { a: string }
		expected?: { a: string }
	}[] = [
		{
			name: 'drops the User Properties of an AUTH over the server Maximum Packet Size (MQTT-3.15.2-3)',
			userProperties: { a: 'x'.repeat(300) },
		},
		{
			name: 'keeps the User Properties of an AUTH under the server Maximum Packet Size',
			userProperties: { a: 'ok' },
			expected: { a: 'ok' },
		},
	]

	for (const authTest of authTests) {
		it(authTest.name, testOptions, async () => {
			const { server, port, received } = await startServer(
				{ maximumPacketSize: 64 },
				// the AUTH that continues the enhanced authentication has to
				// follow the CONNACK on the same connection
				(serverClient) => {
					serverClient.auth({
						reasonCode: 24,
						properties: { authenticationMethod: 'json' },
					})
				},
			)
			const client = mqtt.connect({
				port,
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
						userProperties: authTest.userProperties,
					},
				})
			}
			try {
				await connected(client)
				const packet = (await waitFor(
					() => received[0] as IAuthPacket | undefined,
					'the AUTH to reach the server',
				)) as IAuthPacket
				assert.strictEqual(packet.cmd, 'auth')
				assert.strictEqual(
					packet.properties?.authenticationMethod,
					'json',
					'the Authentication Method is kept',
				)
				if (authTest.expected) {
					assert.deepEqual(
						packet.properties?.userProperties,
						authTest.expected,
					)
				} else {
					assert.isNotOk(packet.properties?.userProperties)
				}
			} finally {
				await stop(client, server)
			}
		})
	}
})
