'use strict'

var MqttServer = require('./server').MqttServer
var MqttServerNoWait = require('./server').MqttServerNoWait
var debug = require('debug')('TEST:server_helpers')

/**
 * This will build the client for the server to use during testing, and set up the
 * server side client based on mqtt-connection for handling MQTT messages.
 * @param {boolean} fastFlag
 */
function serverBuilder (fastFlag) {
  var handler = function (serverClient) {
    serverClient.on('auth', function (packet) {
      var rc = 'reasonCode'
      var connack = {}
      connack[rc] = 0
      serverClient.connack(connack)
    })
    serverClient.on('connect', function (packet) {
      var rc = 'returnCode'
      var connack = {}
      if (serverClient.options && serverClient.options.protocolVersion === 5) {
        rc = 'reasonCode'
        if (packet.clientId === 'invalid') {
          connack[rc] = 128
        } else {
          connack[rc] = 0
        }
      } else {
        if (packet.clientId === 'invalid') {
          connack[rc] = 2
        } else {
          connack[rc] = 0
        }
      }
      if (packet.properties && packet.properties.authenticationMethod) {
        return false
      } else {
        serverClient.connack(connack)
      }
    })

    serverClient.on('publish', function (packet) {
      setImmediate(function () {
        switch (packet.qos) {
          case 0:
            break
          case 1:
            serverClient.puback(packet)
            break
          case 2:
            serverClient.pubrec(packet)
            break
        }
      })
    })

    serverClient.on('pubrel', function (packet) {
      serverClient.pubcomp(packet)
    })

    serverClient.on('pubrec', function (packet) {
      serverClient.pubrel(packet)
    })

    serverClient.on('pubcomp', function () {
      // Nothing to be done
    })

    serverClient.on('subscribe', function (packet) {
      serverClient.suback({
        messageId: packet.messageId,
        granted: packet.subscriptions.map(function (e) {
          return e.qos
        })
      })
    })

    serverClient.on('unsubscribe', function (packet) {
      packet.granted = packet.unsubscriptions.map(function () { return 0 })
      serverClient.unsuback(packet)
    })

    serverClient.on('pingreq', function () {
      serverClient.pingresp()
    })

    serverClient.on('end', function () {
      debug('disconnected from server')
    })
  }
  if (fastFlag) {
    return new MqttServerNoWait(handler)
  } else {
    return new MqttServer(handler)
  }
}

exports.serverBuilder = serverBuilder
