import EventEmitter from 'events'
import type { IClientOptions } from './client'
import type MqttClient from './client'

export type DoneCallback = (error?: Error) => void

export interface IStream extends EventEmitter {
	pipe(to: any): any
	destroy(): any
	end(): any
}

export type StreamBuilder = (
	client: MqttClient,
	opts: IClientOptions,
) => IStream

export type Callback = () => void
