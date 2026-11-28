import { describe, it, type TestContext } from 'node:test'
import { once } from 'node:events'
import net, { type AddressInfo } from 'node:net'
import { setImmediate as immediate } from 'node:timers/promises'
import { assert } from 'chai'
import { MqttClient } from '../../src'
import { MqttServer } from './server'

async function fixture(t: TestContext) {
	let attempts = 0
	let packets = 0
	const server = new MqttServer((peer) => {
		peer.on('connect', () => {
			packets++
			peer.connack({ returnCode: 0, sessionPresent: false })
		})
		peer.on('disconnect', () => peer.stream.end())
		peer.on('error', () => {})
	})
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	const { port } = server.address() as AddressInfo
	const client = new MqttClient(
		() => {
			attempts++
			return net.connect(port, '127.0.0.1')
		},
		{ reconnectPeriod: 10 },
	)
	t.after(async () => {
		await client.endAsync(true)
		client.stream.destroy()
		for (const socket of server.connectionList) socket.destroy()
		await new Promise<void>((resolve) => server.close(() => resolve()))
	})
	await new Promise<void>((resolve) =>
		client.once('connect', () => resolve()),
	)
	return { client, attempts: () => attempts, packets: () => packets }
}

describe('ending from a reconnect listener', () => {
	for (const automatic of [true, false]) {
		for (const force of [false, true]) {
			it(
				`cancels ${automatic ? 'automatic' : 'manual'} reconnect with force=${force}`,
				{ timeout: 3000 },
				async (t) => {
					const { client, attempts, packets } = await fixture(t)
					const ended = new Promise<void>((resolve, reject) => {
						client.once('reconnect', () => {
							client.end(force, (err) =>
								err ? reject(err) : resolve(),
							)
						})
					})
					if (automatic) client.stream.destroy()
					else client.reconnect()
					await ended
					// Let the reconnect listener's caller return before inspecting attempts.
					await immediate()
					assert.equal(
						attempts(),
						1,
						'end must prevent a new TCP connection',
					)
					assert.equal(packets(), 1)
				},
			)
		}
		it(
			`preserves ${automatic ? 'automatic' : 'manual'} reconnect without end`,
			{ timeout: 3000 },
			async (t) => {
				const { client, attempts, packets } = await fixture(t)
				const reconnected = new Promise<void>((resolve) =>
					client.once('connect', () => resolve()),
				)
				if (automatic) client.stream.destroy()
				else client.reconnect()
				await reconnected
				assert.equal(attempts(), 2)
				assert.equal(packets(), 2)
			},
		)
	}
})
