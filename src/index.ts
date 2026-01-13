import * as mqtt from './mqtt'

export default mqtt
export * from './mqtt'

// Explicit re-exports for ESM bundle compatibility
export {
	connect,
	connectAsync,
	MqttClient,
	Client,
	Store,
	DefaultMessageIdProvider,
	UniqueMessageIdProvider,
	KeepaliveManager,
} from './mqtt'
