import assert from 'assert'
import { AddressInfo, createServer, Server, Socket } from 'net'
import { describe, it, mock, afterEach, beforeEach } from 'node:test'
import openSocks from 'src/lib/connect/socks'

const PORT = 6666

type State5 = 'new' | 'id' | 'connect'

class MockServer5 {
	readonly connect: Promise<Socket>

	responseID = Buffer.from([0x05, 0x00])

	responseREQUEST = Buffer.from([
		0x05, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x12, 0x34,
	])

	private server = createServer()

	private onConnect: (socket: Socket) => void

	private onError: (err: any) => void

	private socket?: Socket

	private state: State5 = 'new'

	private destination?: [string, number]

	constructor() {
		this.connect = new Promise((resolve, reject) => {
			this.onConnect = resolve
			this.onError = reject
		})
	}

	start(): Promise<number> {
		this.server.listen(PORT, 'localhost')

		this.server.on('connection', this.onConnection)

		return new Promise((r) => {
			this.server.once('listening', () => r(this.port()))
		})
	}

	port(): number {
		return (this.server.address() as AddressInfo).port
	}

	destroy() {
		this.server.close()
		this.socket?.end()
		this.socket?.destroy()
	}

	destinationAddress(): string | undefined {
		return this.destination?.[0]
	}

	destinationPort(): number | undefined {
		return this.destination?.[1]
	}

	private onConnection = (socket: Socket) => {
		if (this.socket) {
			socket.destroy()
			return this.onError(new Error('double connect to SOCKS5 server'))
		}

		this.socket = socket

		socket.on('data', this.onData)
	}

	private onData = (chunk: Buffer) => {
		switch (this.state) {
			case 'new': {
				const [ver, nmethods] = chunk

				if (
					ver !== 0x05 ||
					nmethods === 0 ||
					chunk.length !== nmethods + 2
				) {
					return this.onError(new Error('bad ID packet'))
				}

				if (chunk.subarray(2, 2 + nmethods).indexOf(0x00) === -1) {
					return this.onError(new Error('no supported METHOD'))
				}

				this.socket?.write?.(this.responseID)
				this.state = 'id'

				break
			}

			case 'id':
				this.destination = this.parseConnect(chunk)

				if (this.destination === undefined) {
					return this.onError(new Error('bad REQUEST packet'))
				}

				this.socket?.write(this.responseREQUEST)

				this.state = 'connect'
				this.socket.off('data', this.onData)
				this.onConnect(this.socket)

				break
		}
	}

	private parseConnect(buf: Buffer): [string, number] | undefined {
		const [ver, cmd, rsv, atyp] = buf

		if (ver !== 0x05 || cmd !== 0x01 || rsv !== 0x00) return undefined

		const port = (buf[buf.length - 2] << 8) | buf[buf.length - 1]

		switch (atyp) {
			case 0x01:
				if (buf.length !== 10) return undefined

				return [buf.subarray(4, 8).join('.'), port]

			case 0x03:
				if (buf.length !== 7 + buf[4]) return undefined

				return [buf.subarray(5, 5 + buf[4]).toString('ascii'), port]

			default:
				return undefined
		}
	}
}

describe('SOCKS layer', { timeout: 1000 }, () => {
	let server5!: MockServer5
	let server4: Server | undefined

	beforeEach(() => {
		server5 = new MockServer5()
	})

	afterEach(() => {
		server5.destroy()
		server4?.close()
	})

	it('should resolve hostnames locally for socks5', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5://localhost:${port}`,
			{
				lookup,
			},
		)

		await server5.connect

		stream.destroy()

		await new Promise((r) => {
			stream.once('close', r)
		})

		assert.strictEqual(lookup.mock.callCount(), 1)
		assert.strictEqual(lookup.mock.calls[0].arguments[0], 'foo.bar')
		assert.strictEqual(server5.destinationAddress(), '1.2.3.4')
		assert.strictEqual(server5.destinationPort(), 1883)
	})

	it('should resolve hostnames remotely for socks5h', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5h://localhost:${port}`,
			{
				lookup,
			},
		)

		await server5.connect

		stream.destroy()

		await new Promise((r) => {
			stream.once('close', r)
		})

		assert.strictEqual(lookup.mock.callCount(), 0)
		assert.strictEqual(server5.destinationAddress(), 'foo.bar')
		assert.strictEqual(server5.destinationPort(), 1883)
	})

	it('errors during name resolution should be emitted on stream', async () => {
		const ERROR = new Error()

		const lookup = mock.fn((address) => Promise.reject(ERROR))

		const stream = openSocks('foo.bar', 1883, 'socks5://localhost:6666', {
			lookup,
		})

		const error = await new Promise((r) => {
			stream.once('error', r)
		})

		assert.strictEqual(error, ERROR)
	})

	it('errors during SOCKS connect should be emitted on stream', async () => {
		const port = await server5.start()
		server5.responseID = Buffer.from([0x00, 0x00])

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5://localhost:${port}`,
			{
				lookup,
			},
		)

		const err = await new Promise((r) => {
			stream.once('error', r)
		})

		stream.destroy()

		assert(err instanceof Error)
	})

	it('data flows through the stream after SOCKS has connected', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5://localhost:${port}`,
			{
				lookup,
			},
		)

		const socket = await server5.connect

		socket.once('data', (chunk) => socket.write(`${chunk.toString()} pong`))

		const response = await new Promise((resolve, reject) => {
			stream.once('error', (err) => {
				reject(err)
			})

			stream.once('data', (chunk) => {
				resolve(chunk.toString())
			})

			stream.write('ping')
		})

		server5.destroy()
		stream.destroy()

		assert.strictEqual(response, 'ping pong')
	})

	it('data written to the stream is buffered until SOCKS has connected', async () => {
		const port = await server5.start()

		let startNameResolution!: () => undefined
		const resolutionPromise = new Promise<void>((r) => {
			startNameResolution = r as () => undefined
		})

		const lookup = mock.fn((_: string) =>
			resolutionPromise.then(() => ({
				address: '1.2.3.4',
			})),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5://localhost:${port}`,
			{
				lookup,
			},
		)

		stream.write('ping')
		startNameResolution()

		const socket = await server5.connect

		socket.once('data', (chunk) => socket.write(`${chunk.toString()} pong`))

		const response = await new Promise((resolve, reject) => {
			stream.once('error', (err) => {
				reject(err)
			})

			stream.once('data', (chunk) => {
				resolve(chunk.toString())
			})
		})

		server5.destroy()
		stream.destroy()

		assert.strictEqual(response, 'ping pong')
	})

	it('closing the stream closes the connection', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5://localhost:${port}`,
			{
				lookup,
			},
		)

		const socket = await server5.connect

		stream.destroy()

		await new Promise((r) => {
			socket.once('close', r)
		})
	})

	it('closing the connection closes the stream', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5://localhost:${port}`,
			{
				lookup,
			},
		)

		const socket = await server5.connect
		socket.destroy()

		await new Promise((r) => {
			stream.once('close', r)
		})
	})

	it('resetting the connection errors the stream', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks5://localhost:${port}`,
			{
				lookup,
			},
		)

		const socket = await server5.connect
		socket.resetAndDestroy()

		const error = await new Promise((r) => {
			stream.once('error', r)
		})

		assert(error instanceof Error)
	})

	it('an invalid protocol errors the stream', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks('foo.bar', 1883, `socks://localhost:${port}`, {
			lookup,
		})

		const error = await new Promise((r) => {
			stream.once('error', r)
		})

		assert(error instanceof Error)
	})

	it('an invalid URL errors the stream', async () => {
		const port = await server5.start()

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks('foo.bar', 1883, `socks:localhost:${port}`, {
			lookup,
		})

		const error = await new Promise((r) => {
			stream.once('error', r)
		})

		assert(error instanceof Error)
	})

	it('should resolve hostnames locally for socks4', async () => {
		let onConnect!: (socket: Socket) => void
		const connect = new Promise<Socket>((r) => {
			onConnect = mock.fn((socket: Socket) => {
				socket.destroy()
				r(socket)
			})
		})

		server4 = await new Promise<Server>((resolve, reject) => {
			const server = createServer(onConnect)

			server.on('listening', () => resolve(server))
			server.on('error', reject)

			server.listen()
		})

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks4://localhost:${(server4.address() as AddressInfo).port}`,
			{
				lookup,
			},
		)

		const socket = await connect

		socket.destroy()
		stream.destroy()

		assert.strictEqual(lookup.mock.callCount(), 1)
		assert.strictEqual(lookup.mock.calls[0].arguments[0], 'foo.bar')
	})

	it('should resolve hostnames remotely for socks4a', async () => {
		let onConnect!: (socket: Socket) => void
		const connect = new Promise<Socket>((r) => {
			onConnect = mock.fn((socket: Socket) => {
				socket.destroy()
				r(socket)
			})
		})

		server4 = await new Promise<Server>((resolve, reject) => {
			const server = createServer(onConnect)

			server.on('listening', () => resolve(server))
			server.on('error', reject)

			server.listen()
		})

		const lookup = mock.fn((_: string) =>
			Promise.resolve({ address: '1.2.3.4' }),
		)

		const stream = openSocks(
			'foo.bar',
			1883,
			`socks4a://localhost:${(server4.address() as AddressInfo).port}`,
			{
				lookup,
			},
		)

		const socket = await connect

		socket.destroy()
		stream.destroy()

		assert.strictEqual(lookup.mock.callCount(), 0)
	})
})
