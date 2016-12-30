'use strict'

var http = require('http')
var websocket = require('websocket-stream')
var WebSocketServer = require('ws').Server
var Connection = require('mqtt-connection')
var abstractClientTests = require('./abstract_client')
var mqtt = require('../')
var xtend = require('xtend')
var port = 9999
var server = http.createServer()

function attachWebsocketServer (wsServer) {
  var wss = new WebSocketServer({server: wsServer})

  wss.on('connection', function (ws) {
    var stream = websocket(ws)
    var connection = new Connection(stream)

    wsServer.emit('client', connection)
    stream.on('error', function () {})
    connection.on('error', function () {})
  })

  return wsServer
}

attachWebsocketServer(server)

server.on('client', function (client) {
  client.on('connect', function (packet) {
    if (packet.clientId === 'invalid') {
      client.connack({ returnCode: 2 })
    } else {
      server.emit('connect', client)
      client.connack({returnCode: 0})
    }
  })

  client.on('publish', function (packet) {
    setImmediate(function () {
      switch (packet.qos) {
        case 0:
          break
        case 1:
          client.puback(packet)
          break
        case 2:
          client.pubrec(packet)
          break
      }
    })
  })

  client.on('pubrel', function (packet) {
    client.pubcomp(packet)
  })

  client.on('pubrec', function (packet) {
    client.pubrel(packet)
  })

  client.on('pubcomp', function () {
    // Nothing to be done
  })

  client.on('subscribe', function (packet) {
    client.suback({
      messageId: packet.messageId,
      granted: packet.subscriptions.map(function (e) {
        return e.qos
      })
    })
  })

  client.on('unsubscribe', function (packet) {
    client.unsuback(packet)
  })

  client.on('pingreq', function () {
    client.pingresp()
  })
}).listen(port)

describe('Websocket Client', function () {
  var config = { protocol: 'ws', port: port }

  it('should use mqtt as the protocol by default', function (done) {
    server.once('client', function (client) {
      client.stream.socket.protocol.should.equal('mqtt')
    })

    var opts = xtend(config, {})

    mqtt.connect(opts).on('connect', function () {
      this.end(true, done)
    })
  })

  it('should use mqttv3.1 as the protocol if using v3.1', function (done) {
    server.once('client', function (client) {
      client.stream.socket.protocol.should.equal('mqttv3.1')
    })

    var opts = xtend(config, {
      protocolId: 'MQIsdp',
      protocolVersion: 3
    })

    mqtt.connect(opts).on('connect', function () {
      this.end(true, done)
    })
  })

  abstractClientTests(server, config)
})
