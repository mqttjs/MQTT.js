import EventEmitter from 'events'
import type { IClientOptions } from './client'
import type MqttClient from './client'
import { Packet } from 'mqtt-packet'
import { Duplex, Writable } from 'readable-stream'
import { Socket } from 'net'

export type DoneCallback = (error?: Error) => void

export type GenericCallback<T> = (error?: Error, result?: T) => void

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
