'use strict'

var mqtt = require('..')
var abstractClientTests = require('./abstract_client')
var Buffer = require('safe-buffer').Buffer
var MqttServer = require('./server').MqttServer
var assert = require('chai').assert
var serverBuilder = require('./server_helpers_for_client_tests').serverBuilder
var ports = require('./helpers/port_list')

describe('MQTT 5.0', function () {
  var server = serverBuilder().listen(ports.PORTAND115)
  var config = { protocol: 'mqtt', port: ports.PORTAND115, protocolVersion: 5, properties: { maximumPacketSize: 200 } }

  abstractClientTests(server, config)

  // var server = serverBuilder().listen(ports.PORTAND115)

  var topicAliasTests = [
    {properties: {}, name: 'should allow any topicAlias when no topicAliasMaximum provided in settings'},
    {properties: { topicAliasMaximum: 15 }, name: 'should not allow topicAlias > topicAliasMaximum when topicAliasMaximum provided in settings'}
  ]

  topicAliasTests.forEach(function (test) {
    it(test.name, function (done) {
      this.timeout(15000)
      server.once('client', function (serverClient) {
        serverClient.on('publish', function (packet) {
          if (packet.properties && packet.properties.topicAlias) {
            done(new Error('Packet should not have topicAlias'))
            return false
          } else {
            serverClient.end(done)
          }
        })
      })
      var opts = {host: 'localhost', port: ports.PORTAND115, protocolVersion: 5, properties: test.properties}
      var client = mqtt.connect(opts)
      client.publish('t/h', 'Message', { properties: { topicAlias: 22 } })
    })
  })

  it('should throw an error if there is Auth Data with no Auth Method', function (done) {
    this.timeout(5000)
    var client
    var opts = {host: 'localhost', port: ports.PORTAND115, protocolVersion: 5, properties: { authenticationData: Buffer.from([1, 2, 3, 4]) }}
    console.log('client connecting')
    client = mqtt.connect(opts)
    client.on('error', function (error) {
      console.log('error hit')
      assert.strictEqual(error.message, 'Packet has no Authentication Method')
      // client will not be connected, so we will call done.
      assert.isTrue(client.disconnected, 'validate client is disconnected')
      client.end(true, done)
    })
  })

  it('auth packet', function (done) {
    this.timeout(15000)
    server.once('client', function (serverClient) {
      console.log('server received client')
      serverClient.on('auth', function (packet) {
        console.log('serverClient received auth: packet %o', packet)
        serverClient.end(done)
      })
    })
    var opts = {host: 'localhost', port: ports.PORTAND115, protocolVersion: 5, properties: { authenticationMethod: 'json' }, authPacket: {}}
    console.log('calling mqtt connect')
    mqtt.connect(opts)
  })

  it('Maximum Packet Size', function (done) {
    this.timeout(15000)
    var opts = {host: 'localhost', port: ports.PORTAND115, protocolVersion: 5, properties: { maximumPacketSize: 1 }}
    var client = mqtt.connect(opts)
    client.on('error', function (error) {
      assert.strictEqual(error.message, 'exceeding packets size connack')
      client.end(true, done)
    })
  })

  it('Change values of some properties by server response', function (done) {
    this.timeout(15000)
    var server116 = new MqttServer(function (serverClient) {
      serverClient.on('connect', function (packet) {
        serverClient.connack({
          reasonCode: 0,
          properties: {
            topicAliasMaximum: 15,
            serverKeepAlive: 16,
            maximumPacketSize: 95
          }
        })
      })
    }).listen(ports.PORTAND116)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND116,
      protocolVersion: 5,
      properties: {
        topicAliasMaximum: 10,
        serverKeepAlive: 11,
        maximumPacketSize: 100
      }
    }
    var client = mqtt.connect(opts)
    client.on('connect', function () {
      assert.strictEqual(client.options.keepalive, 16)
      assert.strictEqual(client.options.properties.topicAliasMaximum, 15)
      assert.strictEqual(client.options.properties.maximumPacketSize, 95)
      server116.close()
      client.end(true, done)
    })
  })

  it('should resubscribe when reconnecting with protocolVersion 5 and Session Present flag is false', function (done) {
    this.timeout(15000)
    var tryReconnect = true
    var reconnectEvent = false
    var server316 = new MqttServer(function (serverClient) {
      serverClient.on('connect', function (packet) {
        serverClient.connack({
          reasonCode: 0,
          sessionPresent: false
        })
        serverClient.on('subscribe', function () {
          if (!tryReconnect) {
            server316.close()
            serverClient.end(done)
          }
        })
      })
    }).listen(ports.PORTAND316)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND316,
      protocolVersion: 5
    }
    var client = mqtt.connect(opts)

    client.on('reconnect', function () {
      reconnectEvent = true
    })

    client.on('connect', function (connack) {
      assert.isFalse(connack.sessionPresent)
      if (tryReconnect) {
        client.subscribe('hello', function () {
          client.stream.end()
        })

        tryReconnect = false
      } else {
        assert.isTrue(reconnectEvent)
      }
    })
  })

  it('should resubscribe when reconnecting with protocolVersion 5 and properties', function (done) {
    // this.timeout(15000)
    var tryReconnect = true
    var reconnectEvent = false
    var server326 = new MqttServer(function (serverClient) {
      serverClient.on('connect', function (packet) {
        serverClient.connack({
          reasonCode: 0,
          sessionPresent: false
        })
      })
      serverClient.on('subscribe', function (packet) {
        if (!reconnectEvent) {
          serverClient.suback({
            messageId: packet.messageId,
            granted: packet.subscriptions.map(function (e) {
              return e.qos
            })
          })
        } else {
          if (!tryReconnect) {
            assert.strictEqual(packet.properties.userProperties.test, 'test')
            serverClient.end(done)
            server326.close()
          }
        }
      })
    }).listen(ports.PORTAND326)

    var opts = {
      host: 'localhost',
      port: ports.PORTAND326,
      protocolVersion: 5
    }
    var client = mqtt.connect(opts)

    client.on('reconnect', function () {
      reconnectEvent = true
    })

    client.on('connect', function (connack) {
      assert.isFalse(connack.sessionPresent)
      if (tryReconnect) {
        client.subscribe('hello', { properties: { userProperties: { test: 'test' } } }, function () {
          client.stream.end()
        })

        tryReconnect = false
      } else {
        assert.isTrue(reconnectEvent)
      }
    })
  })

  var serverThatSendsErrors = new MqttServer(function (serverClient) {
    serverClient.on('connect', function (packet) {
      serverClient.connack({
        reasonCode: 0
      })
    })
    serverClient.on('publish', function (packet) {
      setImmediate(function () {
        switch (packet.qos) {
          case 0:
            break
          case 1:
            packet.reasonCode = 142
            delete packet.cmd
            serverClient.puback(packet)
            break
          case 2:
            packet.reasonCode = 142
            delete packet.cmd
            serverClient.pubrec(packet)
            break
        }
      })
    })

    serverClient.on('pubrel', function (packet) {
      packet.reasonCode = 142
      delete packet.cmd
      serverClient.pubcomp(packet)
    })
  })

  it('Subscribe properties', function (done) {
    this.timeout(15000)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND119,
      protocolVersion: 5
    }
    var subOptions = { properties: { subscriptionIdentifier: 1234 } }
    var server119 = new MqttServer(function (serverClient) {
      serverClient.on('connect', function (packet) {
        serverClient.connack({
          reasonCode: 0
        })
      })
      serverClient.on('subscribe', function (packet) {
        assert.strictEqual(packet.properties.subscriptionIdentifier, subOptions.properties.subscriptionIdentifier)
        server119.close()
        serverClient.end()
        done()
      })
    }).listen(ports.PORTAND119)

    var client = mqtt.connect(opts)
    client.on('connect', function () {
      client.subscribe('a/b', subOptions)
    })
  })

  it('puback handling errors check', function (done) {
    this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND117)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND117,
      protocolVersion: 5
    }
    var client = mqtt.connect(opts)
    client.once('connect', () => {
      client.publish('a/b', 'message', {qos: 1}, function (err, packet) {
        assert.strictEqual(err.message, 'Publish error: Session taken over')
        assert.strictEqual(err.code, 142)
      })
      serverThatSendsErrors.close()
      client.end(true, done)
    })
  })

  it('pubrec handling errors check', function (done) {
    this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND118)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND118,
      protocolVersion: 5
    }
    var client = mqtt.connect(opts)
    client.once('connect', () => {
      client.publish('a/b', 'message', {qos: 2}, function (err, packet) {
        assert.strictEqual(err.message, 'Publish error: Session taken over')
        assert.strictEqual(err.code, 142)
      })
      serverThatSendsErrors.close()
      client.end(true, done)
    })
  })

  it('puback handling custom reason code', function (done) {
    // this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND117)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND117,
      protocolVersion: 5,
      customHandleAcks: function (topic, message, packet, cb) {
        var code = 0
        if (topic === 'a/b') {
          code = 128
        }
        cb(code)
      }
    }

    serverThatSendsErrors.once('client', function (serverClient) {
      serverClient.once('subscribe', function () {
        serverClient.publish({ topic: 'a/b', payload: 'payload', qos: 1, messageId: 1 })
      })

      serverClient.on('puback', function (packet) {
        assert.strictEqual(packet.reasonCode, 128)
        serverClient.end(done)
        serverClient.destroy()
        serverThatSendsErrors.close()
      })
    })

    var client = mqtt.connect(opts)
    client.once('connect', function () {
      client.subscribe('a/b', {qos: 1})
    })
  })

  it('server side disconnect', function (done) {
    this.timeout(15000)
    var server327 = new MqttServer(function (serverClient) {
      serverClient.on('connect', function (packet) {
        serverClient.connack({
          reasonCode: 0
        })
        serverClient.disconnect({reasonCode: 128})
        server327.close()
      })
    })
    server327.listen(ports.PORTAND327)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND327,
      protocolVersion: 5
    }

    var client = mqtt.connect(opts)
    client.once('disconnect', function (disconnectPacket) {
      assert.strictEqual(disconnectPacket.reasonCode, 128)
      client.end(true, done)
    })
  })

  it('pubrec handling custom reason code', function (done) {
    this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND117)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND117,
      protocolVersion: 5,
      customHandleAcks: function (topic, message, packet, cb) {
        var code = 0
        if (topic === 'a/b') {
          code = 128
        }
        cb(code)
      }
    }

    serverThatSendsErrors.once('client', function (serverClient) {
      serverClient.once('subscribe', function () {
        serverClient.publish({ topic: 'a/b', payload: 'payload', qos: 2, messageId: 1 })
      })

      serverClient.on('pubrec', function (packet) {
        assert.strictEqual(packet.reasonCode, 128)
        client.end(true, done)
        serverClient.destroy()
        serverThatSendsErrors.close()
      })
    })

    var client = mqtt.connect(opts)
    client.once('connect', function () {
      client.subscribe('a/b', {qos: 1})
    })
  })

  it('puback handling custom reason code with error', function (done) {
    this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND117)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND117,
      protocolVersion: 5,
      customHandleAcks: function (topic, message, packet, cb) {
        var code = 0
        if (topic === 'a/b') {
          cb(new Error('a/b is not valid'))
        }
        cb(code)
      }
    }

    serverThatSendsErrors.once('client', function (serverClient) {
      serverClient.once('subscribe', function () {
        serverClient.publish({ topic: 'a/b', payload: 'payload', qos: 1, messageId: 1 })
      })
    })

    var client = mqtt.connect(opts)
    client.on('error', function (error) {
      assert.strictEqual(error.message, 'a/b is not valid')
      client.end(true, done)
      serverThatSendsErrors.close()
    })
    client.once('connect', function () {
      client.subscribe('a/b', {qos: 1})
    })
  })

  it('pubrec handling custom reason code with error', function (done) {
    this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND117)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND117,
      protocolVersion: 5,
      customHandleAcks: function (topic, message, packet, cb) {
        var code = 0
        if (topic === 'a/b') {
          cb(new Error('a/b is not valid'))
        }
        cb(code)
      }
    }

    serverThatSendsErrors.once('client', function (serverClient) {
      serverClient.once('subscribe', function () {
        serverClient.publish({ topic: 'a/b', payload: 'payload', qos: 2, messageId: 1 })
      })
    })

    var client = mqtt.connect(opts)
    client.on('error', function (error) {
      assert.strictEqual(error.message, 'a/b is not valid')
      client.end(true, done)
      serverThatSendsErrors.close()
    })
    client.once('connect', function () {
      client.subscribe('a/b', {qos: 1})
    })
  })

  it('puback handling custom invalid reason code', function (done) {
    this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND117)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND117,
      protocolVersion: 5,
      customHandleAcks: function (topic, message, packet, cb) {
        var code = 0
        if (topic === 'a/b') {
          code = 124124
        }
        cb(code)
      }
    }

    serverThatSendsErrors.once('client', function (serverClient) {
      serverClient.once('subscribe', function () {
        serverClient.publish({ topic: 'a/b', payload: 'payload', qos: 1, messageId: 1 })
      })
    })

    var client = mqtt.connect(opts)
    client.on('error', function (error) {
      assert.strictEqual(error.message, 'Wrong reason code for puback')
      client.end(true, done)
      serverThatSendsErrors.close()
    })
    client.once('connect', function () {
      client.subscribe('a/b', {qos: 1})
    })
  })

  it('pubrec handling custom invalid reason code', function (done) {
    this.timeout(15000)
    serverThatSendsErrors.listen(ports.PORTAND117)
    var opts = {
      host: 'localhost',
      port: ports.PORTAND117,
      protocolVersion: 5,
      customHandleAcks: function (topic, message, packet, cb) {
        var code = 0
        if (topic === 'a/b') {
          code = 34535
        }
        cb(code)
      }
    }

    serverThatSendsErrors.once('client', function (serverClient) {
      serverClient.once('subscribe', function () {
        serverClient.publish({ topic: 'a/b', payload: 'payload', qos: 2, messageId: 1 })
      })
    })

    var client = mqtt.connect(opts)
    client.on('error', function (error) {
      assert.strictEqual(error.message, 'Wrong reason code for pubrec')
      client.end(true, done)
      serverThatSendsErrors.close()
    })
    client.once('connect', function () {
      client.subscribe('a/b', {qos: 1})
    })
  })
})
