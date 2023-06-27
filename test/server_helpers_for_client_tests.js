'use strict'

const MqttServer = require('./server').MqttServer
const MqttSecureServer = require('./server').MqttSecureServer
const debug = require('debug')('TEST:server_helpers')

const path = require('path')
const fs = require('fs')
const KEY = path.join(__dirname, 'helpers', 'tls-key.pem')
const CERT = path.join(__dirname, 'helpers', 'tls-cert.pem')

const http = require('http')
const WebSocket = require('ws')
const MQTTConnection = require('mqtt-connection')

/**
 * This will build the client for the server to use during testing, and set up the
 * server side client based on mqtt-connection for handling MQTT messages.
 * @param {String} protocol - 'mqtt', 'mqtts' or 'ws'
 * @param {Function} handler - event handler
 */
function serverBuilder (protocol, handler) {
  const defaultHandler = function (serverClient) {
    serverClient.on('auth', function (packet) {
      if (serverClient.writable) return false
      const rc = 'reasonCode'
      const connack = {}
      connack[rc] = 0
      serverClient.connack(connack)
    })
    serverClient.on('connect', function (packet) {
      if (!serverClient.writable) return false
      let rc = 'returnCode'
      const connack = {}
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
      if (!serverClient.writable) return false
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
      if (!serverClient.writable) return false
      serverClient.pubcomp(packet)
    })

    serverClient.on('pubrec', function (packet) {
      if (!serverClient.writable) return false
      serverClient.pubrel(packet)
    })

    serverClient.on('pubcomp', function () {
      // Nothing to be done
    })

    serverClient.on('subscribe', function (packet) {
      if (!serverClient.writable) return false
      serverClient.suback({
        messageId: packet.messageId,
        granted: packet.subscriptions.map(function (e) {
          return e.qos
        })
      })
    })

    serverClient.on('unsubscribe', function (packet) {
      if (!serverClient.writable) return false
      packet.granted = packet.unsubscriptions.map(function () { return 0 })
      serverClient.unsuback(packet)
    })

    serverClient.on('pingreq', function () {
      if (!serverClient.writable) return false
      serverClient.pingresp()
    })

    serverClient.on('end', function () {
      debug('disconnected from server')
    })
  }

  if (!handler) {
    handler = defaultHandler
  }

  if (
    protocol === 'mqtt') {
    return new MqttServer(handler)
  } else if (
    protocol === 'mqtts') {
    return new MqttSecureServer({
      key: fs.readFileSync(KEY),
      cert: fs.readFileSync(CERT)
    },
    handler)
  } else if (
    protocol === 'ws') {
    const attachWebsocketServer = function (server) {
      const webSocketServer = new WebSocket.Server({ server: server, perMessageDeflate: false })

      webSocketServer.on('connection', function (ws) {
        const stream = WebSocket.createWebSocketStream(ws)
        const connection = new MQTTConnection(stream)
        connection.protocol = ws.protocol
        server.emit('client', connection)
        stream.on('error', function () {})
        connection.on('error', function () {})
        connection.on('close', function () {})
      })
    }

    const httpServer = http.createServer()
    attachWebsocketServer(httpServer)
    httpServer.on('client', handler)
    return httpServer
  }
}

exports.serverBuilder = serverBuilder
