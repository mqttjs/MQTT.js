// ESM entry point for browser bundle
// This file explicitly re-exports using ES6 syntax to ensure
// esbuild properly creates named exports in the ESM bundle

import * as mqtt from './mqtt'

export default mqtt
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

// Re-export all other exports
export * from './mqtt'
