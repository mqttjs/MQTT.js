import { assert } from 'chai'
import { describe, it } from 'node:test'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import mqttPacket, {
	type IConnackPacket,
	type IPublishPacket,
} from 'mqtt-packet'
import { MqttServer } from './server'
import mqtt, { UniqueMessageIdProvider, type MqttClient } from '../../src'

/**
 * A scripted MQTT 5 server that answers CONNECT with `properties` and records
 * every PUBLISH it receives.
 */
async function startServer(properties: IConnackPacket['properties']) {
	const publishes: IPublishPacket[] = []
	const server = new MqttServer((serverClient) => {
		serverClient.on('connect', () => {
			serverClient.connack({
				reasonCode: 0,
				sessionPresent: false,
				properties,
			})
		})
		serverClient.on('publish', (packet: IPublishPacket) => {
			publishes.push(packet)
			if (packet.qos === 1) {
				serverClient.puback({ messageId: packet.messageId })
			}
		})
		serverClient.on('error', () => {})
	})
	server.listen(0)
	await once(server, 'listening')
	const { port } = server.address() as AddressInfo
	return { server, port, publishes }
}

function publish(
	client: MqttClient,
	topic: string,
	payload: string,
	opts: mqtt.IClientPublishOptions,
) {
	return new Promise<Error | undefined>((resolve) => {
		client.publish(topic, payload, opts, (err) => resolve(err))
	})
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

const cases: {
	name: string
	properties: IConnackPacket['properties']
	opts: mqtt.IClientPublishOptions
	payload?: string
	error: RegExp
}[] = [
	{
		name: 'QoS above the server Maximum QoS (MQTT-3.2.2-11)',
		properties: { maximumQoS: 1 },
		opts: { qos: 2 },
		error: /QoS 2 exceeds the server Maximum QoS 1/,
	},
	{
		name: 'QoS 1 when the server Maximum QoS is 0 (MQTT-3.2.2-11)',
		properties: { maximumQoS: 0 },
		opts: { qos: 1 },
		error: /QoS 1 exceeds the server Maximum QoS 0/,
	},
	{
		name: 'RETAIN 1 when the server has Retain Available 0 (MQTT-3.2.2-14)',
		properties: { retainAvailable: false },
		opts: { qos: 1, retain: true },
		error: /Retain Available is 0/,
	},
	{
		name: 'a packet over the server Maximum Packet Size (MQTT-3.2.2-15)',
		properties: { maximumPacketSize: 128 },
		opts: { qos: 1 },
		payload: 'x'.repeat(300),
		error: /packet size \d+ exceeds the server Maximum Packet Size 128/,
	},
	{
		name: 'a QoS 0 packet over the server Maximum Packet Size (MQTT-3.2.2-15)',
		properties: { maximumPacketSize: 128 },
		opts: { qos: 0 },
		payload: 'x'.repeat(300),
		error: /packet size \d+ exceeds the server Maximum Packet Size 128/,
	},
	{
		name: 'a Subscription Identifier (MQTT-3.3.4-6)',
		properties: {},
		opts: { qos: 1, properties: { subscriptionIdentifier: 5 } },
		error: /must not send a Subscription Identifier/,
	},
	{
		name: 'a Topic Alias above the server Topic Alias Maximum',
		properties: { topicAliasMaximum: 2 },
		opts: { qos: 1, properties: { topicAlias: 3 } },
		error: /Sending Topic Alias out of range/,
	},
]

// a refused publish whose callback never comes must fail, not hang
const testOptions = { timeout: 5000 }

describe('MQTT 5.0 outgoing PUBLISH limits from CONNACK', () => {
	for (const c of cases) {
		it(
			`refuses ${c.name} and keeps the connection`,
			testOptions,
			async () => {
				const { server, port, publishes } = await startServer(
					c.properties,
				)
				const messageIdProvider = new UniqueMessageIdProvider()
				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					reconnectPeriod: 0,
					messageIdProvider,
				})
				try {
					await connected(client)

					const err = await publish(
						client,
						'limits/refused',
						c.payload ?? 'x',
						c.opts,
					)
					assert.match(err?.message, c.error)
					const refusedId = client.getLastMessageId()
					assert.deepEqual(
						client.outgoing,
						{},
						'outgoing entry removed',
					)
					assert.isTrue(
						messageIdProvider.register(refusedId),
						'message id freed',
					)
					messageIdProvider.deallocate(refusedId)

					// the connection is still up and takes a valid publish
					const qos = c.properties.maximumQoS === 0 ? 0 : 1
					const okErr = await publish(client, 'limits/ok', 'ok', {
						qos,
					})
					assert.isNotOk(okErr)
					// a QoS 0 callback comes before the server has read the packet
					while (publishes.length === 0) {
						await new Promise((resolve) => {
							setTimeout(resolve, 10)
						})
					}
					assert.isTrue(client.connected)
					assert.deepEqual(
						publishes.map((p) => p.topic.toString()),
						['limits/ok'],
						'the refused PUBLISH never reached the server',
					)
				} finally {
					await stop(client, server)
				}
			},
		)
	}

	it(
		'checks a publish queued offline against the CONNACK it goes out on',
		testOptions,
		async () => {
			const { server, port, publishes } = await startServer({
				maximumQoS: 1,
			})
			const messageIdProvider = new UniqueMessageIdProvider()
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				messageIdProvider,
			})
			try {
				// published before the CONNACK: stored, then sent after it
				const refused = publish(client, 'limits/refused', 'x', {
					qos: 2,
				})
				const refusedId = client.getLastMessageId()
				const ok = publish(client, 'limits/ok', 'ok', { qos: 1 })
				assert.match(
					(await refused)?.message,
					/QoS 2 exceeds the server Maximum QoS 1/,
				)
				assert.isNotOk(await ok)
				assert.deepEqual(client.outgoing, {})
				const stored = await new Promise((resolve) => {
					client.outgoingStore.get({ messageId: refusedId }, (err) =>
						resolve(err),
					)
				})
				assert.instanceOf(stored, Error, 'store entry removed')
				assert.isTrue(
					messageIdProvider.register(refusedId),
					'message id freed',
				)
				assert.deepEqual(
					publishes.map((p) => p.topic.toString()),
					['limits/ok'],
				)
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'calls back once for a refused publish queued during the store replay',
		testOptions,
		async () => {
			const { server, port, publishes } = await startServer({
				maximumQoS: 1,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				let calls = 0
				const queued = new Promise<Error | undefined>((resolve) => {
					// refused during the replay, so this publish is queued
					// until the replay ends
					client.publish('limits/a', 'x', { qos: 2 }, () => {
						client.publish('limits/b', 'x', { qos: 2 }, (err) => {
							calls++
							resolve(err)
						})
					})
				})
				assert.match(
					(await queued)?.message,
					/QoS 2 exceeds the server Maximum QoS 1/,
				)
				assert.isNotOk(
					await publish(client, 'limits/ok', 'ok', { qos: 1 }),
				)
				assert.strictEqual(calls, 1)
				assert.deepEqual(client.outgoing, {})
				assert.deepEqual(
					publishes.map((p) => p.topic.toString()),
					['limits/ok'],
				)
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'refuses a long run of stored publishes without growing the stack',
		{ timeout: 30000 },
		async () => {
			const { server, port, publishes } = await startServer({
				maximumQoS: 1,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				// stored before the CONNACK, each refused when the store replays it
				const refused = Array.from({ length: 3000 }, (_, i) =>
					publish(client, `limits/refused/${i}`, 'x', { qos: 2 }),
				)
				const errors = await Promise.all(refused)
				assert.isTrue(errors.every((err) => err instanceof Error))
				assert.isNotOk(
					await publish(client, 'limits/ok', 'ok', { qos: 1 }),
				)
				assert.deepEqual(client.outgoing, {})
				assert.deepEqual(
					publishes.map((p) => p.topic.toString()),
					['limits/ok'],
				)
			} finally {
				await stop(client, server)
			}
		},
	)

	const allowed: {
		name: string
		properties: IConnackPacket['properties']
		opts: mqtt.IClientPublishOptions
		topic?: string
		payload: string
	}[] = [
		{
			name: 'a Topic Alias equal to the server Topic Alias Maximum',
			properties: { topicAliasMaximum: 2 },
			opts: { qos: 1, properties: { topicAlias: 2 } },
			payload: 'x',
		},
		{
			name: 'RETAIN 1 when CONNACK leaves out Retain Available',
			properties: {},
			opts: { qos: 1, retain: true },
			payload: 'x',
		},
		{
			name: 'RETAIN 1 when the server has Retain Available 1',
			properties: { retainAvailable: true },
			opts: { qos: 1, retain: true },
			payload: 'x',
		},
		{
			// 1 (header) + 1 (remaining length) + 2 + 5 (topic) + 1 (properties
			// length) + 118 (payload) = 128
			name: 'a packet exactly at the server Maximum Packet Size',
			properties: { maximumPacketSize: 128 },
			opts: { qos: 0 },
			topic: 'big/t',
			payload: 'x'.repeat(118),
		},
	]

	for (const c of allowed) {
		it(`sends ${c.name}`, testOptions, async () => {
			const { server, port, publishes } = await startServer(c.properties)
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await connected(client)
				assert.isNotOk(
					await publish(
						client,
						c.topic ?? 'limits/ok',
						c.payload,
						c.opts,
					),
				)
				// a QoS 0 callback comes before the server has read the packet
				assert.isNotOk(
					await publish(client, 'limits/last', 'x', { qos: 1 }),
				)
				assert.strictEqual(publishes.length, 2)
			} finally {
				await stop(client, server)
			}
		})
	}

	it(
		'sizes a publish that reuses a topic alias without its topic',
		testOptions,
		async () => {
			const topic = 'long/topic/name/xxxxxx'
			const { server, port, publishes } = await startServer({
				maximumPacketSize: 64,
				topicAliasMaximum: 5,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				autoAssignTopicAlias: true,
			})
			try {
				await connected(client)
				assert.isNotOk(await publish(client, topic, 'x', { qos: 1 }))
				// with the alias: 1 + 1 + 2 + 0 (topic) + 1 + 3 (alias) + 56 = 64;
				// with the full topic and no alias it would be 83
				assert.isNotOk(
					await publish(client, topic, 'x'.repeat(56), { qos: 0 }),
				)
				assert.isNotOk(
					await publish(client, 'limits/last', 'x', { qos: 1 }),
				)
				assert.strictEqual(publishes.length, 3)
				assert.strictEqual(publishes[1].topic.toString(), '')
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'counts the topic alias that auto-assign adds to the packet size',
		testOptions,
		async () => {
			const { server, port, publishes } = await startServer({
				maximumPacketSize: 128,
				topicAliasMaximum: 5,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
				autoAssignTopicAlias: true,
			})
			try {
				await connected(client)
				// 128 bytes without an alias (see the at-the-limit case above);
				// the alias adds 3, and 1 more for the longer remaining length
				const err = await publish(client, 'big/t', 'x'.repeat(118), {
					qos: 0,
				})
				assert.match(err?.message, /packet size 132 exceeds/)
				// the refused packet registered no alias: the next publish on the
				// topic carries the topic name, not an unknown alias
				assert.isNotOk(await publish(client, 'big/t', 'ok', { qos: 1 }))
				assert.strictEqual(publishes.length, 1)
				assert.strictEqual(publishes[0].topic.toString(), 'big/t')
			} finally {
				await stop(client, server)
			}
		},
	)

	it(
		'sizes multi-byte text and every property kind exactly at the limit',
		testOptions,
		async () => {
			const topic = 'città/中文/😀'
			const opts: mqtt.IClientPublishOptions = {
				qos: 1,
				properties: {
					payloadFormatIndicator: true,
					messageExpiryInterval: 0xffffffff,
					contentType: 'tèxt/😀',
					responseTopic: 'rèsp/中',
					correlationData: Buffer.alloc(9),
					userProperties: { ké: ['v1', 'vä'], k2: '中文' },
				},
			}
			const payload = 'pàyload 😀'.repeat(3)
			const size = mqttPacket.generate(
				{
					cmd: 'publish',
					topic,
					payload,
					messageId: 1,
					dup: false,
					retain: false,
					...opts,
				} as IPublishPacket,
				{ protocolVersion: 5 },
			).length
			// at the limit it goes out, one byte over it is refused
			for (const [max, sent] of [
				[size, true],
				[size - 1, false],
			] as const) {
				const { server, port, publishes } = await startServer({
					maximumPacketSize: max,
				})
				const client = mqtt.connect({
					port,
					protocolVersion: 5,
					reconnectPeriod: 0,
				})
				try {
					await connected(client)
					const err = await publish(client, topic, payload, opts)
					if (sent) {
						assert.isNotOk(err)
						assert.strictEqual(publishes.length, 1)
					} else {
						assert.match(
							err?.message,
							new RegExp(`packet size ${size} exceeds`),
						)
						assert.strictEqual(publishes.length, 0)
					}
				} finally {
					await stop(client, server)
				}
			}
		},
	)

	it('refuses every packet one byte over the limit, whatever its shape', () => {
		// seeded so a failure reproduces
		let seed = 2128
		const rand = (n: number) => {
			seed = (seed * 1103515245 + 12345) % 2 ** 31
			return seed % n
		}
		const text = (n: number) =>
			Array.from(
				{ length: rand(n) },
				() => ['a', 'é', '中', '😀'][rand(4)],
			).join('')
		// never connects: only the limit check runs
		const client = mqtt.connect({ protocolVersion: 5, manualConnect: true })
		client.connected = true
		for (let i = 0; i < 500; i++) {
			const properties: IPublishPacket['properties'] = {}
			if (rand(2)) properties.payloadFormatIndicator = !!rand(2)
			if (rand(2)) properties.messageExpiryInterval = rand(2 ** 31)
			if (rand(2)) properties.contentType = text(30)
			if (rand(2)) properties.responseTopic = text(30)
			if (rand(2)) properties.correlationData = Buffer.alloc(rand(40))
			if (rand(2)) properties.topicAlias = 1 + rand(10)
			if (rand(2)) {
				properties.userProperties = {}
				for (let k = rand(4); k > 0; k--) {
					properties.userProperties[text(8) || 'k'] = rand(2)
						? text(20)
						: [text(20), text(5)]
				}
			}
			const payloads = [
				'',
				text(200),
				Buffer.alloc([0, 127, 128, 16383, 16384][rand(5)]),
				new Uint8Array(rand(300)),
			]
			const packet = {
				cmd: 'publish',
				topic: text(40) || 't',
				payload: payloads[rand(payloads.length)],
				qos: rand(3),
				messageId: 1 + rand(65000),
				retain: false,
				dup: false,
				properties: rand(4) ? properties : undefined,
			} as IPublishPacket
			const size = mqttPacket.generate(packet, {
				protocolVersion: 5,
			}).length
			client['_serverProperties'] = { maximumPacketSize: size }
			assert.isUndefined(client['_checkOutgoingPublish'](packet))
			client['_serverProperties'] = { maximumPacketSize: size - 1 }
			assert.match(
				client['_checkOutgoingPublish'](packet)?.message,
				new RegExp(`packet size ${size} exceeds`),
				`packet ${i}`,
			)
		}
	})
})
