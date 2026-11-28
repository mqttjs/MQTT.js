import { it, type TestContext } from 'node:test'
import { once } from 'node:events'
import net, { type AddressInfo } from 'node:net'
import { assert } from 'chai'
import { useFakeTimers } from 'sinon'
import { MqttClient, type IClientOptions } from '../../src'
import { MqttServer } from './server'

async function fixture(
	t: TestContext,
	options: IClientOptions,
	failFirst = false,
) {
	let attempts = 0
	const errors: Error[] = []
	let connects = 0
	const server = new MqttServer((peer) => {
		peer.on('error', () => {})
		peer.on('connect', () => {
			connects++
			if (failFirst && connects === 1) peer.stream.destroy()
			else peer.connack({ returnCode: 0, sessionPresent: false })
		})
	})
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	const { port } = server.address() as AddressInfo
	const client = new MqttClient(
		() => {
			attempts++
			const socket = net.connect(port, '127.0.0.1')
			socket.on('error', (err) => errors.push(err))
			return socket
		},
		{ manualConnect: true, reconnectPeriod: 10, ...options },
	)
	const clock = useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
	t.after(async () => {
		await client.endAsync(true)
		clock.restore()
		for (const socket of server.connectionList) socket.destroy()
		await new Promise<void>((resolve) => server.close(() => resolve()))
	})
	return { client, clock, errors, attempts: () => attempts }
}

const invalidOptions: {
	options: IClientOptions
	message: string
	repair: IClientOptions
}[] = [
	{
		options: { will: { topic: '', payload: 'hello' } },
		message: 'Invalid will topic',
		repair: { will: { topic: 'valid/topic', payload: 'hello' } },
	},
	{
		options: { keepalive: -1 },
		message: 'Invalid keepalive',
		repair: { keepalive: 0 },
	},
	{
		options: { username: 42 as unknown as string },
		message: 'Invalid username',
		repair: { username: 'valid-user' },
	},
]
for (const { options, message, repair } of invalidOptions) {
	for (const reconnectOnConnackError of [false, true]) {
		it(
			`stops retrying ${message} (reconnectOnConnackError=${reconnectOnConnackError}) and permits an explicit retry after repair`,
			{ timeout: 3000 },
			async (t) => {
				const { client, clock, errors, attempts } = await fixture(t, {
					...options,
					reconnectOnConnackError,
				})
				const closed = new Promise<void>((resolve) =>
					client.once('close', () => resolve()),
				)
				client.connect()
				await closed
				await clock.tickAsync(100)
				assert.equal(
					attempts(),
					1,
					'invalid CONNECT must not be retried',
				)
				assert.deepEqual(
					errors.map((error) => error.message),
					[message],
				)
				Object.assign(client.options, repair)
				const connected = new Promise<void>((resolve) =>
					client.once('connect', () => resolve()),
				)
				client.reconnect()
				await connected
				assert.equal(attempts(), 2)
			},
		)
	}
}

it(
	'still retries a valid CONNECT after a transport failure',
	{ timeout: 3000 },
	async (t) => {
		const { client, clock, attempts } = await fixture(t, {}, true)
		const closed = new Promise<void>((resolve) =>
			client.once('close', () => resolve()),
		)
		client.connect()
		await closed
		const connected = new Promise<void>((resolve) =>
			client.once('connect', () => resolve()),
		)
		await clock.tickAsync(10)
		await connected
		assert.equal(attempts(), 2)
	},
)
