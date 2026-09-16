/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */
import MqttClient from './lib/client'
import DefaultMessageIdProvider from './lib/default-message-id-provider'
import UniqueMessageIdProvider from './lib/unique-message-id-provider'
import Store, { IStore } from './lib/store'
import connect, { connectAsync } from './lib/connect'
import KeepaliveManager from './lib/KeepaliveManager'

export const Client = MqttClient
export {
	connect,
	connectAsync,
	MqttClient,
	Store,
	DefaultMessageIdProvider,
	UniqueMessageIdProvider,
	IStore,
	KeepaliveManager,
}
export * from './lib/client'
export * from './lib/shared'
export * from './lib/validations'
export { ReasonCodes } from './lib/handlers/ack'
// `client.outgoing` is public and its entries carry `cmd`, so callers need to
// be able to name its type
export type { PendingCommand } from './lib/handlers/ack'
export type { Timer } from './lib/get-timer'
