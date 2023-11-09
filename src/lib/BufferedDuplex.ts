import { Duplex, Transform } from 'readable-stream'
import WebSocket from 'isomorphic-ws'
import { IClientOptions } from './client'

/**
 * Utils writev function for browser, ensure to write Buffers to socket (convert strings).
 */
export function writev(
	chunks: { chunk: any; encoding: string }[],
	cb: (err?: Error) => void,
) {
	const buffers = new Array(chunks.length)
	for (let i = 0; i < chunks.length; i++) {
		if (typeof chunks[i].chunk === 'string') {
			buffers[i] = Buffer.from(chunks[i].chunk, 'utf8')
		} else {
			buffers[i] = chunks[i].chunk
		}
	}

	this._write(Buffer.concat(buffers), 'binary', cb)
}

/**
 * This util class extends Duplex and accepts a stream as input and returns a stream that accepts incoming data
 * and buffers it until the input stream is open.
 */
export class BufferedDuplex extends Duplex {
	public socket: WebSocket

	public proxy: Transform

	public eventListenerSupport: boolean

	public socketOpen: boolean

	private isReadyPromise: Promise<void>

	private resolveReady: () => void

	constructor(opts: IClientOptions, proxy: Transform, socket: WebSocket) {
		super({
			objectMode: true,
		})
		this.proxy = proxy
		this.socket = socket
		this.eventListenerSupport =
			typeof socket.addEventListener !== 'undefined'

		if (!opts.objectMode) {
			this._writev = writev.bind(this)
		}

		this.socketOpen = false

		this.isReadyPromise = new Promise((resolve) => {
			this.resolveReady = resolve
		})

		const onOpen = () => {
			this.onSocketOpen()
		}

		if (this.eventListenerSupport) {
			socket.addEventListener('open', onOpen)
		} else {
			socket.onopen = onOpen
		}

		this.proxy.on('data', (chunk) => {
			this.push(chunk)
		})
	}

	onSocketOpen() {
		this.socketOpen = true
		this.resolveReady()
		this.emit('connect')
	}

	_read(size?: number): void {
		this.proxy.read(size)
	}

	async _write(chunk: any, encoding: string, cb: (err?: Error) => void) {
		if (!this.socketOpen) {
			// wait for socket to open
			await this.isReadyPromise
		}

		if (this.proxy.write(chunk, encoding) === false) {
			this.proxy.once('drain', cb)
		} else {
			cb()
		}
	}

	_final(callback: (error?: Error) => void): void {
		this.proxy.end(callback)
	}
}
