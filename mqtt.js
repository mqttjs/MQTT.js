/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

const MqttClient = require('./dist/client').MqttClient
const connect = require('./dist/connect').connect
const Store = require('./dist/store').Store
const DefaultMessageIdProvider = require('./dist/default-message-id-provider').DefaultMessageIdProvider
const UniqueMessageIdProvider = require('./dist/unique-message-id-provider').UniqueMessageIdProvider

module.exports.connect = connect
module.exports.MqttClient = MqttClient
module.exports.Client = MqttClient
module.exports.Store = Store
module.exports.DefaultMessageIdProvider = DefaultMessageIdProvider
module.exports.UniqueMessageIdProvider = UniqueMessageIdProvider
