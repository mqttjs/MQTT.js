/*
 * Copyright (c) 2015-2015 MQTT.js contributors.
 * Copyright (c) 2011-2014 Adam Rudd.
 *
 * See LICENSE for more information
 */

var MqttClient = require('./lib/client')
var connect = require('./lib/connect')
var Store = require('./lib/store')
var DefaultMessageIdProvider = require('./lib/default-message-id-provider')
var UniqueMessageIdProvider = require('./lib/unique-message-id-provider')

module.exports.connect = connect

// Expose MqttClient
module.exports.MqttClient = MqttClient
module.exports.Client = MqttClient
module.exports.Store = Store
module.exports.DefaultMessageIdProvider = DefaultMessageIdProvider
module.exports.UniqueMessageIdProvider = UniqueMessageIdProvider
