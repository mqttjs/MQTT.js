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
