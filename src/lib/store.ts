/**
 * Module dependencies
 */
import { Readable } from 'readable-stream'
import { type Packet } from 'mqtt-packet'
import { type DoneCallback } from './shared'

const streamsOpts = { objectMode: true }
const defaultStoreOptions = {
	clean: true,
}

export interface IStoreOptions {
	/**
	 * true, clear _inflights at close
	 */
	clean?: boolean
}

export type PacketCallback = (error?: Error, packet?: Packet) => void

export interface IStore {
	/**
	 * Adds a packet to the store, a packet is
	 * anything that has a messageId property.
	 *
	 */
	put(packet: Packet, cb: DoneCallback): IStore

	/**
	 * Creates a stream with all the packets in the store
	 *
	 */
	createStream(): Readable

	/**
	 * deletes a packet from the store.
	 */
	del(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): IStore

	/**
	 * get a packet from the store.
	 */
	get(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): IStore

	/**
	 * Close the store
	 */
	close(cb: DoneCallback): void
}

/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 * @param {Object} [options] - store options
 */
export default class Store implements IStore {
	private options: IStoreOptions

	private _inflights: Map<number, Packet>

	constructor(options?: IStoreOptions) {
		this.options = options || {}

		// Defaults
		this.options = { ...defaultStoreOptions, ...options }

		this._inflights = new Map()
	}

	/**
	 * Adds a packet to the store, a packet is
	 * anything that has a messageId property.
	 *
	 */
	put(packet: Packet, cb: DoneCallback) {
		// @ts-expect-error - here the Packet union type declares that messageId can be undefined. This can be resolved by a type guard but will change to logic of the code.
		this._inflights.set(packet.messageId, packet)

		if (cb) {
			cb()
		}

		return this
	}

	/**
	 * Creates a stream with all the packets in the store
	 *
	 */
	createStream() {
		const stream = new Readable(streamsOpts)
		const values: Packet[] = []
		let destroyed = false
		let i = 0

		this._inflights.forEach((value) => {
			values.push(value)
		})

		stream._read = () => {
			if (!destroyed && i < values.length) {
				stream.push(values[i++])
			} else {
				stream.push(null)
			}
		}

		stream.destroy = (_err: Error | undefined): Readable => {
			if (destroyed) {
				// @ts-expect-error - This is problematic as this is a native method hi-jacking that violates the return type of the original method.
				return
			}

			destroyed = true

			setTimeout(() => {
				stream.emit('close')
			}, 0)

			return stream
		}

		return stream
	}

	/**
	 * deletes a packet from the store.
	 */
	del(packet: Pick<Packet, 'messageId'>, cb: PacketCallback) {
		// @ts-expect-error - here the Packet union type declares that messageId can be undefined. This can be resolved by a type guard but will change to logic of the code.
		const toDelete = this._inflights.get(packet.messageId)
		if (toDelete) {
			// @ts-expect-error - here the Packet union type declares that messageId can be undefined. This can be resolved by a type guard but will change to logic of the code.
			this._inflights.delete(packet.messageId)
			cb(undefined, toDelete)
		} else if (cb) {
			cb(new Error('missing packet'))
		}

		return this
	}

	/**
	 * get a packet from the store.
	 */
	get(packet: Pick<Packet, 'messageId'>, cb: PacketCallback) {
		// @ts-expect-error - here the Packet union type declares that messageId can be undefined. This can be resolved by a type guard but will change to logic of the code.
		const storedPacket = this._inflights.get(packet.messageId)
		if (storedPacket) {
			cb(undefined, storedPacket)
		} else if (cb) {
			cb(new Error('missing packet'))
		}

		return this
	}

	/**
	 * Close the store
	 */
	close(cb: DoneCallback) {
		if (this.options.clean) {
			this._inflights.clear()
		}
		if (cb) {
			cb()
		}
	}
}
