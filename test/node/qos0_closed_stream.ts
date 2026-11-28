import { it, type TestContext } from 'node:test'
import { once } from 'node:events'
import { setImmediate as immediate } from 'node:timers/promises'
import type { AddressInfo } from 'node:net'
import { assert } from 'chai'
import mqtt from '../../src'
import { MqttServer } from './server'

async function fixture(t: TestContext) {
	const server = new MqttServer((peer) => {
		peer.on('connect', () =>
			peer.connack({ returnCode: 0, sessionPresent: false }),
		)
		peer.on('error', () => {})
	})
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	const client = mqtt.connect({
		host: '127.0.0.1',
		port: (server.address() as AddressInfo).port,
		reconnectPeriod: 0,
	})
	t.after(async () => {
		await client.endAsync(true)
		for (const socket of server.connectionList) socket.destroy()
		await new Promise<void>((resolve) => server.close(() => resolve()))
	})
	await new Promise<void>((resolve) =>
		client.once('connect', () => resolve()),
	)
	return client
}

for (const usePromise of [false, true]) {
	for (const duringSend of [false, true]) {
		it(
			`fails QoS 0 ${usePromise ? 'promise' : 'callback'} when the stream is destroyed ${duringSend ? 'by packetsend' : 'before publish'}`,
			{ timeout: 3000 },
			async (t) => {
				const client = await fixture(t)
				const closed = new Promise<void>((resolve) =>
					client.once('close', () => resolve()),
				)
				const drains = client.stream.listenerCount('drain')
				if (duringSend)
					client.once('packetsend', () => client.stream.destroy())
				else client.stream.destroy()
				assert.isTrue(
					client.connected,
					'exercise the window before close',
				)
				let calls = 0
				let error: Error | undefined
				const done = (err?: Error) => {
					calls++
					error = err
				}
				if (usePromise)
					void client
						.publishAsync('test/topic', 'hello', { qos: 0 })
						.then(() => done(), done)
				else client.publish('test/topic', 'hello', { qos: 0 }, done)
				await closed
				await immediate()
				assert.equal(calls, 1, 'the publish must settle exactly once')
				assert.instanceOf(error, Error)
				assert.equal(client.stream.listenerCount('drain'), drains)
			},
		)
	}
	it(
		`completes a normal QoS 0 ${usePromise ? 'promise' : 'callback'}`,
		{ timeout: 3000 },
		async (t) => {
			const client = await fixture(t)
			if (usePromise)
				await client.publishAsync('test/topic', 'hello', { qos: 0 })
			else
				await new Promise<void>((resolve, reject) =>
					client.publish('test/topic', 'hello', { qos: 0 }, (err) =>
						err ? reject(err) : resolve(),
					),
				)
		},
	)
}
