'use strict'

var mqtt = require('..')
var should = require('should')
var fork = require('child_process').fork
var path = require('path')
var abstractClientTests = require('./abstract_client')
var net = require('net')
var eos = require('end-of-stream')
var mqttPacket = require('mqtt-packet')
var Buffer = require('safe-buffer').Buffer
var Duplex = require('readable-stream').Duplex
var Connection = require('mqtt-connection')
var Server = require('./server')
var port = 9876
var server

function connOnlyServer () {
  return new Server(function (client) {
    client.on('connect', function (packet) {
      client.connack({returnCode: 0})
    })
  })
}

/**
 * Test server
 */
function buildServer () {
  return new Server(function (client) {
    client.on('connect', function (packet) {
      if (packet.clientId === 'invalid') {
        client.connack({returnCode: 2})
      } else {
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
  })
}

server = buildServer().listen(port)

describe('MqttClient', function () {
  describe('creating', function () {
    it('should allow instantiation of MqttClient without the \'new\' operator', function (done) {
      should(function () {
        var client
        try {
          client = mqtt.MqttClient(function () {
            throw Error('break')
          }, {})
          client.end()
        } catch (err) {
          if (err.message !== 'break') {
            throw err
          }
          done()
        }
      }).not.throw('Object #<Object> has no method \'_setupStream\'')
    })
  })

  var config = { protocol: 'mqtt', port: port }
  abstractClientTests(server, config)

  describe('message ids', function () {
    it('should increment the message id', function () {
      var client = mqtt.connect(config)
      var currentId = client._nextId()

      client._nextId().should.equal(currentId + 1)
      client.end()
    })

    it('should return 1 once the internal counter reached limit', function () {
      var client = mqtt.connect(config)
      client.nextId = 65535

      client._nextId().should.equal(65535)
      client._nextId().should.equal(1)
      client.end()
    })

    it('should return 65535 for last message id once the internal counter reached limit', function () {
      var client = mqtt.connect(config)
      client.nextId = 65535

      client._nextId().should.equal(65535)
      client.getLastMessageId().should.equal(65535)
      client._nextId().should.equal(1)
      client.getLastMessageId().should.equal(1)
      client.end()
    })

    it('should not throw an error if packet\'s messageId is not found when receiving a pubrel packet', function (done) {
      var server2 = new Server(function (c) {
        c.on('connect', function (packet) {
          c.connack({returnCode: 0})
          c.pubrel({ messageId: Math.floor(Math.random() * 9000) + 1000 })
        })
      })

      server2.listen(port + 49, function () {
        var client = mqtt.connect({
          port: port + 49,
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
      var client = new mqtt.MqttClient(function () {
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
      var server3 = connOnlyServer().listen(port + 72)
      var pubCallbackCalled = false
      var unsubscribeCallbackCalled = false
      var client = mqtt.connect({
        port: port + 72,
        host: 'localhost',
        keepalive: 1,
        connectTimeout: 350,
        reconnectPeriod: 0
      })
      client.once('connect', () => {
        client.publish('fakeTopic', 'fakeMessage', {qos: 1}, (err, result) => {
          should.exist(err)
          pubCallbackCalled = true
        })
        client.unsubscribe('fakeTopic', (err, result) => {
          should.exist(err)
          unsubscribeCallbackCalled = true
        })
        setTimeout(() => {
          client.end(() => {
            should.equal(pubCallbackCalled && unsubscribeCallbackCalled, true, 'callbacks not invoked')
            server3.close()
            done()
          })
        }, 5000)
      })
    })
  })

  describe('reconnecting', function () {
    it('should attempt to reconnect once server is down', function (done) {
      this.timeout(15000)

      var innerServer = fork(path.join(__dirname, 'helpers', 'server_process.js'))
      var client = mqtt.connect({ port: 3000, host: 'localhost', keepalive: 1 })

      client.once('connect', function () {
        innerServer.kill('SIGINT') // mocks server shutdown

        client.once('close', function () {
          should.exist(client.reconnectTimer)
          client.end()
          done()
        })
      })
    })

    it('should reconnect to multiple host-ports combination if servers is passed', function (done) {
      this.timeout(15000)

      var server2 = buildServer().listen(port + 42)

      server2.on('client', function (c) {
        c.stream.destroy()
        server2.close()
      })

      server2.on('listening', function () {
        var client = mqtt.connect({
          servers: [
            { port: port + 42, host: 'localhost' },
            { port: port, host: 'localhost' }
          ],
          keepalive: 50
        })

        server.once('client', function () {
          client.end()
          done()
        })

        client.once('connect', function () {
          client.stream.destroy()
        })
      })
    })

    it('should reconnect if a connack is not received in an interval', function (done) {
      this.timeout(2000)

      var server2 = net.createServer().listen(port + 43)

      server2.on('connection', function (c) {
        eos(c, function () {
          server2.close()
        })
      })

      server2.on('listening', function () {
        var client = mqtt.connect({
          servers: [
            { port: port + 43, host: 'localhost_fake' },
            { port: port, host: 'localhost' }
          ],
          connectTimeout: 500
        })

        server.once('client', function () {
          client.end()
          done()
        })

        client.once('connect', function () {
          client.stream.destroy()
        })
      })
    })

    it('should not be cleared by the connack timer', function (done) {
      this.timeout(4000)

      var server2 = net.createServer().listen(port + 44)

      server2.on('connection', function (c) {
        c.destroy()
      })

      server2.once('listening', function () {
        var reconnects = 0
        var connectTimeout = 1000
        var reconnectPeriod = 100
        var expectedReconnects = Math.floor(connectTimeout / reconnectPeriod)
        var client = mqtt.connect({
          port: port + 44,
          host: 'localhost',
          connectTimeout: connectTimeout,
          reconnectPeriod: reconnectPeriod
        })

        client.on('reconnect', function () {
          reconnects++
          if (reconnects >= expectedReconnects) {
            client.end()
            done()
          }
        })
      })
    })

    it('should not keep requeueing the first message when offline', function (done) {
      this.timeout(2500)

      var server2 = buildServer().listen(port + 45)
      var client = mqtt.connect({
        port: port + 45,
        host: 'localhost',
        connectTimeout: 350,
        reconnectPeriod: 300
      })

      server2.on('client', function (c) {
        client.publish('hello', 'world', { qos: 1 }, function () {
          c.destroy()
          server2.close()
          client.publish('hello', 'world', { qos: 1 })
        })
      })

      setTimeout(function () {
        if (client.queue.length === 0) {
          client.end(true)
          done()
        } else {
          client.end(true)
        }
      }, 2000)
    })

    it('should not send the same subscribe multiple times on a flaky connection', function (done) {
      this.timeout(3500)

      var KILL_COUNT = 4
      var killedConnections = 0
      var subIds = {}
      var client = mqtt.connect({
        port: port + 46,
        host: 'localhost',
        connectTimeout: 350,
        reconnectPeriod: 300
      })

      var server2 = new Server(function (client) {
        client.on('error', function () {})
        client.on('connect', function (packet) {
          if (packet.clientId === 'invalid') {
            client.connack({returnCode: 2})
          } else {
            client.connack({returnCode: 0})
          }
        })
      }).listen(port + 46)

      server2.on('client', function (c) {
        client.subscribe('topic', function () {
          done()
          client.end()
          c.destroy()
          server2.close()
        })

        c.on('subscribe', function (packet) {
          if (killedConnections < KILL_COUNT) {
            // Kill the first few sub attempts to simulate a flaky connection
            killedConnections++
            c.destroy()
          } else {
            // Keep track of acks
            if (!subIds[packet.messageId]) {
              subIds[packet.messageId] = 0
            }
            subIds[packet.messageId]++
            if (subIds[packet.messageId] > 1) {
              done(new Error('Multiple duplicate acked subscriptions received for messageId ' + packet.messageId))
              client.end(true)
              c.destroy()
              server2.destroy()
            }

            c.suback({
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

      var port2 = port + 48

      var server2 = net.createServer(function (stream) {
        var client = new Connection(stream)

        client.on('error', function () {})
        client.on('connect', function (packet) {
          client.connack({returnCode: 0})
          client.destroy()
        })
      })

      server2.listen(port2, function () {
        var client = mqtt.connect({
          port: port2,
          host: 'localhost',
          connectTimeout: 350,
          reconnectPeriod: 300
        })

        client.subscribe('hello')

        setTimeout(function () {
          client.queue.length.should.equal(1)
          client.end()
          done()
        }, 1000)
      })
    })

    it('should not send the same publish multiple times on a flaky connection', function (done) {
      this.timeout(3500)

      var KILL_COUNT = 4
      var killedConnections = 0
      var pubIds = {}
      var client = mqtt.connect({
        port: port + 47,
        host: 'localhost',
        connectTimeout: 350,
        reconnectPeriod: 300
      })

      var server2 = net.createServer(function (stream) {
        var client = new Connection(stream)
        client.on('error', function () {})
        client.on('connect', function (packet) {
          if (packet.clientId === 'invalid') {
            client.connack({returnCode: 2})
          } else {
            client.connack({returnCode: 0})
          }
        })

        this.emit('client', client)
      }).listen(port + 47)

      server2.on('client', function (c) {
        client.publish('topic', 'data', { qos: 1 }, function () {
          done()
          client.end()
          c.destroy()
          server2.destroy()
        })

        c.on('publish', function onPublish (packet) {
          if (killedConnections < KILL_COUNT) {
            // Kill the first few pub attempts to simulate a flaky connection
            killedConnections++
            c.destroy()

            // to avoid receiving inflight messages
            c.removeListener('publish', onPublish)
          } else {
            // Keep track of acks
            if (!pubIds[packet.messageId]) {
              pubIds[packet.messageId] = 0
            }

            pubIds[packet.messageId]++

            if (pubIds[packet.messageId] > 1) {
              done(new Error('Multiple duplicate acked publishes received for messageId ' + packet.messageId))
              client.end(true)
              c.destroy()
              server2.destroy()
            }

            c.puback(packet)
          }
        })
      })
    })
  })
})
