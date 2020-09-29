'use strict'

var mqtt = require('..')
var assert = require('chai').assert
const { fork } = require('child_process')
var path = require('path')
var abstractClientTests = require('./abstract_client')
var net = require('net')
var eos = require('end-of-stream')
var mqttPacket = require('mqtt-packet')
var Buffer = require('safe-buffer').Buffer
var Duplex = require('readable-stream').Duplex
var Connection = require('mqtt-connection')
var MqttServer = require('./server').MqttServer
var util = require('util')
var ports = require('./helpers/port_list')
var serverBuilder = require('./server_helpers_for_client_tests').serverBuilder
var debug = require('debug')('TEST:client')

describe('MqttClient', function () {
  var client
  var server = serverBuilder()
  var config = {protocol: 'mqtt', port: ports.PORT}
  server.listen(ports.PORT)

  after(function () {
    // clean up and make sure the server is no longer listening...
    if (server.listening) {
      server.close()
    }
  })

  abstractClientTests(server, config)

  describe('creating', function () {
    it('should allow instantiation of MqttClient without the \'new\' operator', function (done) {
      try {
        client = mqtt.MqttClient(function () {
          throw Error('break')
        }, {})
        client.end()
      } catch (err) {
        assert.strictEqual(err.message, 'break')
        done()
      }
    })
  })

  describe('message ids', function () {
    it('should increment the message id', function () {
      client = mqtt.connect(config)
      var currentId = client._nextId()

      assert.equal(client._nextId(), currentId + 1)
      client.end()
    })

    it('should return 1 once the internal counter reached limit', function () {
      client = mqtt.connect(config)
      client.nextId = 65535

      assert.equal(client._nextId(), 65535)
      assert.equal(client._nextId(), 1)
      client.end()
    })

    it('should return 65535 for last message id once the internal counter reached limit', function () {
      client = mqtt.connect(config)
      client.nextId = 65535

      assert.equal(client._nextId(), 65535)
      assert.equal(client.getLastMessageId(), 65535)
      assert.equal(client._nextId(), 1)
      assert.equal(client.getLastMessageId(), 1)
      client.end()
    })

    it('should not throw an error if packet\'s messageId is not found when receiving a pubrel packet', function (done) {
      var server2 = new MqttServer(function (serverClient) {
        serverClient.on('connect', function (packet) {
          serverClient.connack({returnCode: 0})
          serverClient.pubrel({ messageId: Math.floor(Math.random() * 9000) + 1000 })
        })
      })

      server2.listen(ports.PORTAND49, function () {
        client = mqtt.connect({
          port: ports.PORTAND49,
          host: 'localhost'
        })

        client.on('packetsend', function (packet) {
          if (packet.cmd === 'pubcomp') {
            client.end()
            server2.close()
            done()
          }
        })
      })
    })

    it('should not go overflow if the TCP frame contains a lot of PUBLISH packets', function (done) {
      var parser = mqttPacket.parser()
      var count = 0
      var max = 1000
      var duplex = new Duplex({
        read: function (n) {},
        write: function (chunk, enc, cb) {
          parser.parse(chunk)
          cb() // nothing to do
        }
      })
      client = new mqtt.MqttClient(function () {
        return duplex
      }, {})

      client.on('message', function (t, p, packet) {
        if (++count === max) {
          done()
        }
      })

      parser.on('packet', function (packet) {
        var packets = []

        if (packet.cmd === 'connect') {
          duplex.push(mqttPacket.generate({
            cmd: 'connack',
            sessionPresent: false,
            returnCode: 0
          }))

          for (var i = 0; i < max; i++) {
            packets.push(mqttPacket.generate({
              cmd: 'publish',
              topic: Buffer.from('hello'),
              payload: Buffer.from('world'),
              retain: false,
              dup: false,
              messageId: i + 1,
              qos: 1
            }))
          }

          duplex.push(Buffer.concat(packets))
        }
      })
    })
  })

  describe('flushing', function () {
    it('should attempt to complete pending unsub and send on ping timeout', function (done) {
      this.timeout(10000)
      var server3 = new MqttServer(function (client) {
        client.on('connect', function (packet) {
          client.connack({returnCode: 0})
        })
      }).listen(ports.PORTAND72)

      var pubCallbackCalled = false
      var unsubscribeCallbackCalled = false
      client = mqtt.connect({
        port: ports.PORTAND72,
        host: 'localhost',
        keepalive: 1,
        connectTimeout: 350,
        reconnectPeriod: 0
      })
      client.once('connect', () => {
        client.publish('fakeTopic', 'fakeMessage', {qos: 1}, (err, result) => {
          assert.exists(err)
          pubCallbackCalled = true
        })
        client.unsubscribe('fakeTopic', (err, result) => {
          assert.exists(err)
          unsubscribeCallbackCalled = true
        })
        setTimeout(() => {
          client.end(() => {
            assert.strictEqual(pubCallbackCalled && unsubscribeCallbackCalled, true, 'callbacks not invoked')
            server3.close()
            done()
          })
        }, 5000)
      })
    })
  })

  describe('reconnecting', function () {
    it('should attempt to reconnect once server is down', function (done) {
      this.timeout(30000)

      var innerServer = fork(path.join(__dirname, 'helpers', 'server_process.js'), { execArgv: ['--inspect'] })
      innerServer.on('close', (code) => {
        if (code) {
          done(util.format('child process closed with code %d', code))
        }
      })

      innerServer.on('exit', (code) => {
        if (code) {
          done(util.format('child process exited with code %d', code))
        }
      })

      client = mqtt.connect({ port: 3000, host: 'localhost', keepalive: 1 })
      client.once('connect', function () {
        innerServer.kill('SIGINT') // mocks server shutdown
        client.once('close', function () {
          assert.exists(client.reconnectTimer)
          client.end(true, done)
        })
      })
    })

    it('should reconnect if a connack is not received in an interval', function (done) {
      this.timeout(2000)

      var server2 = net.createServer().listen(ports.PORTAND43)

      server2.on('connection', function (c) {
        eos(c, function () {
          server2.close()
        })
      })

      server2.on('listening', function () {
        client = mqtt.connect({
          servers: [
            { port: ports.PORTAND43, host: 'localhost_fake' },
            { port: ports.PORT, host: 'localhost' }
          ],
          connectTimeout: 500
        })

        server.once('client', function () {
          client.end(true, (err) => {
            done(err)
          })
        })

        client.once('connect', function () {
          client.stream.destroy()
        })
      })
    })

    it('should not be cleared by the connack timer', function (done) {
      this.timeout(4000)

      var server2 = net.createServer().listen(ports.PORTAND44)

      server2.on('connection', function (c) {
        c.destroy()
      })

      server2.once('listening', function () {
        var reconnects = 0
        var connectTimeout = 1000
        var reconnectPeriod = 100
        var expectedReconnects = Math.floor(connectTimeout / reconnectPeriod)
        client = mqtt.connect({
          port: ports.PORTAND44,
          host: 'localhost',
          connectTimeout: connectTimeout,
          reconnectPeriod: reconnectPeriod
        })

        client.on('reconnect', function () {
          reconnects++
          if (reconnects >= expectedReconnects) {
            client.end(true, done)
          }
        })
      })
    })

    it('should not keep requeueing the first message when offline', function (done) {
      this.timeout(2500)

      var server2 = serverBuilder().listen(ports.PORTAND45)
      client = mqtt.connect({
        port: ports.PORTAND45,
        host: 'localhost',
        connectTimeout: 350,
        reconnectPeriod: 300
      })

      server2.on('client', function (serverClient) {
        client.publish('hello', 'world', { qos: 1 }, function () {
          serverClient.destroy()
          server2.close(() => {
            debug('now publishing message in an offline state')
            client.publish('hello', 'world', { qos: 1 })
          })
        })
      })

      setTimeout(function () {
        if (client.queue.length === 0) {
          debug('calling final client.end()')
          client.end(true, (err) => done(err))
        } else {
          debug('calling client.end()')
          client.end(true)
        }
      }, 2000)
    })

    it('should not send the same subscribe multiple times on a flaky connection', function (done) {
      this.timeout(3500)

      var KILL_COUNT = 4
      var killedConnections = 0
      var subIds = {}
      client = mqtt.connect({
        port: ports.PORTAND46,
        host: 'localhost',
        connectTimeout: 350,
        reconnectPeriod: 300
      })

      var server2 = new MqttServer(function (serverClient) {
        serverClient.on('error', function () {})
        debug('setting serverClient connect callback')
        serverClient.on('connect', function (packet) {
          if (packet.clientId === 'invalid') {
            debug('connack with returnCode 2')
            serverClient.connack({returnCode: 2})
          } else {
            debug('connack with returnCode 0')
            serverClient.connack({returnCode: 0})
          }
        })
      }).listen(ports.PORTAND46)

      server2.on('client', function (serverClient) {
        debug('client received on server2.')
        debug('subscribing to topic `topic`')
        client.subscribe('topic', function () {
          debug('once subscribed to topic, end client, destroy serverClient, and close server.')
          serverClient.destroy()
          server2.close(() => { client.end(true, done) })
        })

        serverClient.on('subscribe', function (packet) {
          if (killedConnections < KILL_COUNT) {
            // Kill the first few sub attempts to simulate a flaky connection
            killedConnections++
            serverClient.destroy()
          } else {
            // Keep track of acks
            if (!subIds[packet.messageId]) {
              subIds[packet.messageId] = 0
            }
            subIds[packet.messageId]++
            if (subIds[packet.messageId] > 1) {
              done(new Error('Multiple duplicate acked subscriptions received for messageId ' + packet.messageId))
              client.end(true)
              serverClient.end()
              server2.destroy()
            }

            serverClient.suback({
              messageId: packet.messageId,
              granted: packet.subscriptions.map(function (e) {
                return e.qos
              })
            })
          }
        })
      })
    })

    it('should not fill the queue of subscribes if it cannot connect', function (done) {
      this.timeout(2500)
      var server2 = net.createServer(function (stream) {
        var serverClient = new Connection(stream)

        serverClient.on('error', function (e) { /* do nothing */ })
        serverClient.on('connect', function (packet) {
          serverClient.connack({returnCode: 0})
          serverClient.destroy()
        })
      })

      server2.listen(ports.PORTAND48, function () {
        client = mqtt.connect({
          port: ports.PORTAND48,
          host: 'localhost',
          connectTimeout: 350,
          reconnectPeriod: 300
        })

        client.subscribe('hello')

        setTimeout(function () {
          assert.equal(client.queue.length, 1)
          client.end(true, () => {
            done()
          })
        }, 1000)
      })
    })

    it('should not send the same publish multiple times on a flaky connection', function (done) {
      this.timeout(3500)

      var KILL_COUNT = 4
      var killedConnections = 0
      var pubIds = {}
      client = mqtt.connect({
        port: ports.PORTAND47,
        host: 'localhost',
        connectTimeout: 350,
        reconnectPeriod: 300
      })

      var server2 = net.createServer(function (stream) {
        var serverClient = new Connection(stream)
        serverClient.on('error', function () {})
        serverClient.on('connect', function (packet) {
          if (packet.clientId === 'invalid') {
            serverClient.connack({returnCode: 2})
          } else {
            serverClient.connack({returnCode: 0})
          }
        })

        this.emit('client', serverClient)
      }).listen(ports.PORTAND47)

      server2.on('client', function (serverClient) {
        client.publish('topic', 'data', { qos: 1 }, function () {
          serverClient.destroy()
          server2.close()
          client.end(true, done)
        })

        serverClient.on('publish', function onPublish (packet) {
          if (killedConnections < KILL_COUNT) {
            // Kill the first few pub attempts to simulate a flaky connection
            killedConnections++
            serverClient.destroy()

            // to avoid receiving inflight messages
            serverClient.removeListener('publish', onPublish)
          } else {
            // Keep track of acks
            if (!pubIds[packet.messageId]) {
              pubIds[packet.messageId] = 0
            }

            pubIds[packet.messageId]++

            if (pubIds[packet.messageId] > 1) {
              done(new Error('Multiple duplicate acked publishes received for messageId ' + packet.messageId))
              client.end(true)
              serverClient.destroy()
              server2.destroy()
            }

            serverClient.puback(packet)
          }
        })
      })
    })
  })

  it('check emit error on checkDisconnection w/o callback', function (done) {
    this.timeout(15000)

    var server118 = new MqttServer(function (client) {
      client.on('connect', function (packet) {
        client.connack({
          reasonCode: 0
        })
      })
      client.on('publish', function (packet) {
        setImmediate(function () {
          packet.reasonCode = 0
          client.puback(packet)
        })
      })
    }).listen(ports.PORTAND118)

    var opts = {
      host: 'localhost',
      port: ports.PORTAND118,
      protocolVersion: 5
    }
    client = mqtt.connect(opts)

    // wait for the client to receive an error...
    client.on('error', function (error) {
      assert.equal(error.message, 'client disconnecting')
      server118.close()
      done()
    })
    client.on('connect', function () {
      client.end(function () {
        client._checkDisconnecting()
      })
      server118.close()
    })
  })
})
