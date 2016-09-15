'use strict'

var mqtt = require('..')
var should = require('should')
var fork = require('child_process').fork
var path = require('path')
var abstractClientTests = require('./abstract_client')
var net = require('net')
var eos = require('end-of-stream')
var Server = require('./server')
var port = 9876
var server

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

    it('should return 1 once the interal counter reached limit', function () {
      var client = mqtt.connect(config)
      client.nextId = 65535

      client._nextId().should.equal(65535)
      client._nextId().should.equal(1)
      client.end()
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

    it('shoud not be cleared by the connack timer', function (done) {
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

    it('shoud not keep requeueing the first message when offline', function (done) {
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
  })
})
