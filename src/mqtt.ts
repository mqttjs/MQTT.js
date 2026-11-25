/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */
import MqttClient from './lib/client.js'
import DefaultMessageIdProvider from './lib/default-message-id-provider.js'
import UniqueMessageIdProvider from './lib/unique-message-id-provider.js'
import Store, { type IStore } from './lib/store.js'
import connect, { connectAsync } from './lib/connect/index.js'
import KeepaliveManager from './lib/KeepaliveManager.js'

export const Client = MqttClient
export {
	connect,
	connectAsync,
	MqttClient,
	Store,
	DefaultMessageIdProvider,
	UniqueMessageIdProvider,
	KeepaliveManager,
}
export type { IStore }
export * from './lib/client.js'
export * from './lib/shared.js'
export * from './lib/validations.js'
export { ReasonCodes } from './lib/handlers/ack.js'
// `client.outgoing` is public and its entries carry `cmd`, so callers need to
// be able to name its type
export type { PendingCommand } from './lib/handlers/ack.js'
export type { Timer } from './lib/get-timer.js'
