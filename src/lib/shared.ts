import type { Packet, ISubackPacket } from 'mqtt-packet'
import type { Duplex as NativeDuplex } from 'node:stream'
import type { Duplex } from 'readable-stream'
import type MqttClient from './client'
import type { IClientOptions } from './client'

export type DoneCallback = (error?: Error) => void

export type GenericCallback<T> = (error?: Error, result?: T) => void

export type VoidCallback = () => void

export type IStream = (Duplex | NativeDuplex) & {
	/** only set on browsers, it's a [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)  */
	socket?: any
}

export type StreamBuilder = (
	client: MqttClient,
	opts?: IClientOptions,
) => IStream

export type Callback = () => void

/**
 * The handle a packet handler gets on the connection its packet was parsed
 * from. `MqttClient.connect()` creates one per connection and hands it to
 * every handler alongside `done`, because a handler can outlive its
 * connection: an application that parks inside `handleMessage` or
 * `customHandleAcks` and answers after a reconnect resumes a handler whose
 * connection is already gone.
 */
export interface PacketPump {
	/**
	 * Drops the packets that were parsed out of the same chunk as this one but
	 * have not been handled yet.
	 */
	discardParsedPackets(): void
	/**
	 * `false` once the client has moved on to a later connection, so a handler
	 * can tell a live connection from the one it was parsed on.
	 */
	isCurrent(): boolean
}

export type PacketHandler = (
	client: MqttClient,
	packet: Packet,
	done?: DoneCallback,
	pump?: PacketPump,
) => void

export type TimerVariant = 'auto' | 'worker' | 'native'

export class ErrorWithReasonCode extends Error {
	public code: number

	public constructor(message: string, code: number) {
		super(message)
		this.code = code

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ErrorWithReasonCode.prototype)
		Object.getPrototypeOf(this).name = 'ErrorWithReasonCode'
	}
}

export class ErrorWithSubackPacket extends Error {
	public packet: ISubackPacket

	public constructor(message: string, packet: ISubackPacket) {
		super(message)
		this.packet = packet

		// We need to set the prototype explicitly
		Object.setPrototypeOf(this, ErrorWithSubackPacket.prototype)
		Object.getPrototypeOf(this).name = 'ErrorWithSubackPacket'
	}
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Constructor<T = {}> = new (...args: any[]) => T

export function applyMixin(
	target: Constructor,
	mixin: Constructor,
	includeConstructor = false,
): void {
	// Figure out the inheritance chain of the mixin
	const inheritanceChain: Constructor[] = [mixin]

	while (true) {
		const current = inheritanceChain[0]
		const base = Object.getPrototypeOf(current)
		if (base?.prototype) {
			inheritanceChain.unshift(base)
		} else {
			break
		}
	}
	for (const ctor of inheritanceChain) {
		for (const prop of Object.getOwnPropertyNames(ctor.prototype)) {
			// Do not override the constructor
			if (includeConstructor || prop !== 'constructor') {
				Object.defineProperty(
					target.prototype,
					prop,
					Object.getOwnPropertyDescriptor(ctor.prototype, prop) ??
						Object.create(null),
				)
			}
		}
	}
}
export const nextTick =
	typeof process?.nextTick === 'function'
		? process.nextTick
		: (callback: () => void) => {
				setTimeout(callback, 0)
			}

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const MQTTJS_VERSION = require('../../package.json').version
