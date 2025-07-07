import { Duplex, type Transform } from 'readable-stream'
import { Buffer } from 'buffer'
import { type IClientOptions } from './client.js'

interface WritevChunksParameters {
	chunk: unknown
	encoding: string
}

/**
 * Utils writev function for browser, ensure to write Buffers to socket (convert strings).
 */
export function writev(
	chunks: Array<WritevChunksParameters>,
	cb: (err?: Error) => void,
) {
	const buffers = new Array(chunks.length)
	for (let i = 0; i < chunks.length; i++) {
		const chunk: WritevChunksParameters | undefined = chunks[i]

		if (chunk === undefined) {
			continue
		}

		if (typeof chunk.chunk === 'string') {
			buffers[i] = Buffer.from(chunk.chunk, 'utf8')

			continue
		}

		buffers[i] = chunk.chunk
	}

	// @ts-expect-error - @TODO: @SmashingQuasar check where writev is being hijacked.
	this._write(Buffer.concat(buffers), 'binary', cb)
}

/**
 * How this works:
 * - `socket` is the `WebSocket` instance, the connection to our broker.
 * - `proxy` is a `Transform`, it ensure data written to the `socket` is a `Buffer`.
 * This class buffers the data written to the `proxy` (so then to `socket`) until the `socket` is ready.
 * The stream returned from this class, will be passed to the `MqttClient`.
 */
export class BufferedDuplex extends Duplex {
	public socket: WebSocket

	private proxy: Transform

	private isSocketOpen: boolean

	private writeQueue: Array<{
		chunk: any
		encoding: string
		cb: (err?: Error) => void
	}>

	public constructor(
		opts: IClientOptions,
		proxy: Transform,
		socket: WebSocket,
	) {
		super({
			objectMode: true,
		})
		this.proxy = proxy
		this.socket = socket
		this.writeQueue = []

		if (!opts.objectMode) {
			this._writev = writev.bind(this)
		}

		this.isSocketOpen = false

		this.proxy.on('data', (chunk) => {
			if (!this.destroyed && this.readable) {
				this.push(chunk)
			}
		})
	}

	public override _read(size?: number): void {
		this.proxy.read(size)
	}

	public override _write(
		chunk: any,
		encoding: string,
		cb: (err?: Error) => void,
	) {
		if (!this.isSocketOpen) {
			// Buffer the data in a queue
			this.writeQueue.push({ chunk, encoding, cb })
		} else {
			this.writeToProxy(chunk, encoding, cb)
		}
	}

	public override _final(callback: (error?: Error) => void): void {
		this.writeQueue = []
		this.proxy.end(callback)
	}

	public override _destroy(
		err: Error,
		callback: (error: Error) => void,
	): void {
		this.writeQueue = []
		// do not pass error here otherwise we should listen for `error` event on proxy to prevent uncaught exception
		this.proxy.destroy()
		callback(err)
	}

	/** Method to call when socket is ready to stop buffering writes */
	public socketReady() {
		this.emit('connect')
		this.isSocketOpen = true
		this.processWriteQueue()
	}

	private writeToProxy(
		chunk: any,
		encoding: string,
		cb: (err?: Error) => void,
	) {
		if (this.proxy.write(chunk, encoding) === false) {
			this.proxy.once('drain', cb)
		} else {
			cb()
		}
	}

	private processWriteQueue() {
		while (this.writeQueue.length > 0) {
			const { chunk, encoding, cb } = this.writeQueue.shift()!
			this.writeToProxy(chunk, encoding, cb)
		}
	}
}
