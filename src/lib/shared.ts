import type { IClientOptions } from './client'
import type MqttClient from './client'
import { Packet } from 'mqtt-packet'
import { Duplex, Writable } from 'readable-stream'

export type DoneCallback = (error?: Error) => void

export type GenericCallback<T> = (error?: Error, result?: T) => void

export type VoidCallback = () => void

export type IStream = Duplex | Writable

export type StreamBuilder = (
	client: MqttClient,
	opts?: IClientOptions,
) => IStream

export type Callback = () => void

export type PacketHandler = (
	client: MqttClient,
	packet: Packet,
	done?: DoneCallback,
) => void

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

// eslint-disable-next-line @typescript-eslint/ban-types
export type Constructor<T = {}> = new (...args: any[]) => T

export function applyMixin(
	target: Constructor,
	mixin: Constructor,
	includeConstructor = false,
): void {
	// Figure out the inheritance chain of the mixin
	const inheritanceChain: Constructor[] = [mixin]
	// eslint-disable-next-line no-constant-condition
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

export class Deferred<T> {
	private readonly _promise: Promise<T>

	private _resolve: (value?: T | PromiseLike<T>) => void

	private _reject: (reason?: any) => void

	constructor() {
		this._promise = new Promise<T>((resolve, reject) => {
			this._resolve = resolve
			this._reject = reject
		})
	}

	get promise(): Promise<T> {
		return this._promise
	}

	get callback(): GenericCallback<T> {
		return (error?: Error, result?: T): void => {
			if (error) {
				this.reject(error)
			} else {
				this.resolve(result)
			}
		}
	}

	resolve = (value?: T | PromiseLike<T>): void => {
		this._resolve(value)
	}

	reject = (reason?: any): void => {
		this._reject(reason)
	}
}
