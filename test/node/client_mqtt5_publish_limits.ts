import { assert } from 'chai'
import { describe, it } from 'node:test'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type { IConnackPacket, IPublishPacket } from 'mqtt-packet'
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
					await once(client, 'connect')

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
					const okErr = await publish(client, 'limits/ok', 'ok', {
						qos: 1,
					})
					assert.isNotOk(okErr)
					assert.isTrue(client.connected)
					assert.deepEqual(
						publishes.map((p) => p.topic.toString()),
						['limits/ok'],
						'the refused PUBLISH never reached the server',
					)
				} finally {
					await new Promise<void>((resolve) => {
						client.end(true, () => resolve())
					})
					server.close()
				}
			},
		)
	}

	it(
		'refuses a QoS 0 publish over the server Maximum Packet Size',
		testOptions,
		async () => {
			const { server, port, publishes } = await startServer({
				maximumPacketSize: 128,
			})
			const client = mqtt.connect({
				port,
				protocolVersion: 5,
				reconnectPeriod: 0,
			})
			try {
				await once(client, 'connect')
				const err = await publish(
					client,
					'limits/refused',
					'x'.repeat(300),
					{
						qos: 0,
					},
				)
				assert.match(
					err?.message,
					/exceeds the server Maximum Packet Size/,
				)
				assert.isNotOk(
					await publish(client, 'limits/ok', 'ok', { qos: 1 }),
				)
				assert.deepEqual(
					publishes.map((p) => p.topic.toString()),
					['limits/ok'],
				)
			} finally {
				await new Promise<void>((resolve) => {
					client.end(true, () => resolve())
				})
				server.close()
			}
		},
	)

	it(
		'checks a publish queued offline against the CONNACK it goes out on',
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
				// published before the CONNACK: stored, then sent after it
				const refused = publish(client, 'limits/refused', 'x', {
					qos: 2,
				})
				const ok = publish(client, 'limits/ok', 'ok', { qos: 1 })
				assert.match(
					(await refused)?.message,
					/QoS 2 exceeds the server Maximum QoS 1/,
				)
				assert.isNotOk(await ok)
				assert.deepEqual(client.outgoing, {})
				assert.deepEqual(
					publishes.map((p) => p.topic.toString()),
					['limits/ok'],
				)
			} finally {
				await new Promise<void>((resolve) => {
					client.end(true, () => resolve())
				})
				server.close()
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
				await once(client, 'connect')
				// topic + payload fill the packet to 128 bytes without an alias:
				// 1 (header) + 1 (remaining length) + 2 + 5 (topic) + 1 (properties
				// length) + 118 (payload) = 128; the alias adds 3, and 1 more for
				// the longer remaining length
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
				await new Promise<void>((resolve) => {
					client.end(true, () => resolve())
				})
				server.close()
			}
		},
	)
})
