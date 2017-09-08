'use strict'

/**
 * Testing dependencies
 */
var should = require('should')
var sinon = require('sinon')
var mqtt = require('../')
var xtend = require('xtend')
var Server = require('./server')
var port = 9876

module.exports = function (server, config) {
  function connect (opts) {
    opts = xtend(config, opts)
    return mqtt.connect(opts)
  }

  describe('closing', function () {
    it('should emit close if stream closes', function (done) {
      var client = connect()

      client.once('connect', function () {
        client.stream.end()
      })
      client.once('close', function () {
        client.end()
        done()
      })
    })

    it('should mark the client as disconnected', function (done) {
      var client = connect()

      client.once('close', function () {
        client.end()
        if (!client.connected) {
          done()
        } else {
          done(new Error('Not marked as disconnected'))
        }
      })
      client.once('connect', function () {
        client.stream.end()
      })
    })

    it('should stop ping timer if stream closes', function (done) {
      var client = connect()

      client.once('close', function () {
        should.not.exist(client.pingTimer)
        client.end()
        done()
      })

      client.once('connect', function () {
        should.exist(client.pingTimer)
        client.stream.end()
      })
    })

    it('should emit close after end called', function (done) {
      var client = connect()

      client.once('close', function () {
        done()
      })

      client.once('connect', function () {
        client.end()
      })
    })

    it('should return `this` if end called twice', function (done) {
      var client = connect()

      client.once('connect', function () {
        client.end()
        var value = client.end()
        if (value === client) {
          done()
        } else {
          done(new Error('Not returning client.'))
        }
      })
    })

    it('should stop ping timer after end called', function (done) {
      var client = connect()

      client.once('connect', function () {
        should.exist(client.pingTimer)
        client.end()
        should.not.exist(client.pingTimer)
        done()
      })
    })
  })

  describe('connecting', function () {
    it('should connect to the broker', function (done) {
      var client = connect()
      client.on('error', done)

      server.once('client', function () {
        client.end()
        done()
      })
    })

    it('should send a default client id', function (done) {
      var client = connect()
      client.on('error', done)

      server.once('client', function (serverClient) {
        serverClient.once('connect', function (packet) {
          packet.clientId.should.match(/mqttjs.*/)
          serverClient.disconnect()
          done()
        })
      })
    })

    it('should send be clean by default', function (done) {
      var client = connect()
      client.on('error', done)

      server.once('client', function (serverClient) {
        serverClient.once('connect', function (packet) {
          packet.clean.should.be.true()
          serverClient.disconnect()
          done()
        })
      })
    })

    it('should connect with the given client id', function (done) {
      var client = connect({clientId: 'testclient'})
      client.on('error', function (err) {
        throw err
      })

      server.once('client', function (serverClient) {
        serverClient.once('connect', function (packet) {
          packet.clientId.should.match(/testclient/)
          serverClient.disconnect()
          done()
        })
      })
    })

    it('should connect with the client id and unclean state', function (done) {
      var client = connect({clientId: 'testclient', clean: false})
      client.on('error', function (err) {
        throw err
      })

      server.once('client', function (serverClient) {
        serverClient.once('connect', function (packet) {
          packet.clientId.should.match(/testclient/)
          packet.clean.should.be.false()
          serverClient.disconnect()
          done()
        })
      })
    })

    it('should require a clientId with clean=false', function (done) {
      try {
        var client = connect({ clean: false })
        client.on('error', function (err) {
          done(err)
          // done(new Error('should have thrown'));
        })
      } catch (err) {
        done()
      }
    })

    it('should default to localhost', function (done) {
      var client = connect({clientId: 'testclient'})
      client.on('error', function (err) {
        throw err
      })

      server.once('client', function (serverClient) {
        serverClient.once('connect', function (packet) {
          packet.clientId.should.match(/testclient/)
          serverClient.disconnect()
          done()
        })
      })
    })

    it('should emit connect', function (done) {
      var client = connect()
      client.once('connect', function () {
        client.end()
        done()
      })
      client.once('error', done)
    })

    it('should provide connack packet with connect event', function (done) {
      server.once('client', function (serverClient) {
        serverClient.connack({returnCode: 0, sessionPresent: true})

        server.once('client', function (serverClient) {
          serverClient.connack({returnCode: 0, sessionPresent: false})
        })
      })

      var client = connect()
      client.once('connect', function (packet) {
        should(packet.sessionPresent).be.equal(true)
        client.once('connect', function (packet) {
          should(packet.sessionPresent).be.equal(false)
          client.end()
          done()
        })
      })
    })

    it('should mark the client as connected', function (done) {
      var client = connect()
      client.once('connect', function () {
        client.end()
        if (client.connected) {
          done()
        } else {
          done(new Error('Not marked as connected'))
        }
      })
    })

    it('should emit error', function (done) {
      var client = connect({clientId: 'invalid'})
      client.once('connect', function () {
        done(new Error('Should not emit connect'))
      })
      client.once('error', function (error) {
        should(error.code).be.equal(2) // code for clientID identifer rejected
        client.end()
        done()
      })
    })

    it('should have different client ids', function (done) {
      var client1 = connect()
      var client2 = connect()

      client1.options.clientId.should.not.equal(client2.options.clientId)
      client1.end(true)
      client2.end(true)
      setImmediate(done)
    })
  })

  describe('handling offline states', function () {
    it('should emit offline events once when the client transitions from connected states to disconnected ones', function (done) {
      var client = connect({reconnectPeriod: 20})

      client.on('connect', function () {
        this.stream.end()
      })

      client.on('offline', function () {
        client.end(true, done)
      })
    })

    it('should emit offline events once when the client (at first) can NOT connect to servers', function (done) {
      // fake a port
      var client = connect({ reconnectPeriod: 20, port: 4557 })

      client.on('offline', function () {
        client.end(true, done)
      })
    })
  })

  describe('topic validations when subscribing', function () {
    it('should be ok for well-formated topics', function (done) {
      var client = connect()
      client.subscribe(
        [
          '+', '+/event', 'event/+', '#', 'event/#', 'system/event/+',
          'system/+/event', 'system/registry/event/#', 'system/+/event/#',
          'system/registry/event/new_device', 'system/+/+/new_device'
        ],
        function (err) {
          client.end()
          if (err) {
            return done(new Error(err))
          }
          done()
        }
      )
    })

    it('should return an error (via callbacks) for topic #/event', function (done) {
      var client = connect()
      client.subscribe(['#/event', 'event#', 'event+'], function (err) {
        client.end()
        if (err) {
          return done()
        }
        done(new Error('Validations do NOT work'))
      })
    })

    it('should return an empty array for duplicate subs', function (done) {
      var client = connect()
      client.subscribe('event', function (err, granted1) {
        if (err) {
          return done()
        }
        client.subscribe('event', function (err, granted2) {
          if (err) {
            return done()
          }
          granted2.should.Array([])
          done()
        })
      })
    })

    it('should return an error (via callbacks) for topic #/event', function (done) {
      var client = connect()
      client.subscribe('#/event', function (err) {
        client.end()
        if (err) {
          return done()
        }
        done(new Error('Validations do NOT work'))
      })
    })

    it('should return an error (via callbacks) for topic event#', function (done) {
      var client = connect()
      client.subscribe('event#', function (err) {
        client.end()
        if (err) {
          return done()
        }
        done(new Error('Validations do NOT work'))
      })
    })

    it('should return an error (via callbacks) for topic system/#/event', function (done) {
      var client = connect()
      client.subscribe('system/#/event', function (err) {
        client.end()
        if (err) {
          return done()
        }
        done(new Error('Validations do NOT work'))
      })
    })

    it('should return an error (via callbacks) for empty topic list', function (done) {
      var client = connect()
      client.subscribe([], function (err) {
        client.end()
        if (err) {
          return done()
        }
        done(new Error('Validations do NOT work'))
      })
    })

    it('should return an error (via callbacks) for topic system/+/#/event', function (done) {
      var client = connect()
      client.subscribe('system/+/#/event', function (err) {
        client.end()
        if (err) {
          return done()
        }
        done(new Error('Validations do NOT work'))
      })
    })
  })

  describe('offline messages', function () {
    it('should queue message until connected', function (done) {
      var client = connect()

      client.publish('test', 'test')
      client.subscribe('test')
      client.unsubscribe('test')
      client.queue.length.should.equal(3)

      client.once('connect', function () {
        client.queue.length.should.equal(0)
        client.end(true, done)
      })
    })

    it('should not queue qos 0 messages if queueQoSZero is false', function (done) {
      var client = connect({queueQoSZero: false})

      client.publish('test', 'test', {qos: 0})
      client.queue.length.should.equal(0)
      client.end(true, done)
    })

    it('should not queue qos != 0 messages', function (done) {
      var client = connect({queueQoSZero: false})

      client.publish('test', 'test', {qos: 1})
      client.publish('test', 'test', {qos: 2})
      client.subscribe('test')
      client.unsubscribe('test')
      client.queue.length.should.equal(2)
      client.end(true, done)
    })

    it('should call cb if an outgoing QoS 0 message is not sent', function (done) {
      var client = connect({queueQoSZero: false})

      client.publish('test', 'test', {qos: 0}, function () {
        client.end(true, done)
      })
    })

    if (!process.env.TRAVIS) {
      it('should delay ending up until all inflight messages are delivered', function (done) {
        var client = connect()

        client.on('connect', function () {
          client.subscribe('test', function () {
            done()
          })
          client.publish('test', 'test', function () {
            client.end()
          })
        })
      })

      it('wait QoS 1 publish messages', function (done) {
        var client = connect()

        client.on('connect', function () {
          client.subscribe('test')
          client.publish('test', 'test', { qos: 1 }, function () {
            client.end()
          })
          client.on('message', function () {
            done()
          })
        })

        server.once('client', function (serverClient) {
          serverClient.on('subscribe', function () {
            serverClient.on('publish', function (packet) {
              serverClient.publish(packet)
            })
          })
        })
      })

      it('does not wait acks when force-closing', function (done) {
        // non-running broker
        var client = connect('mqtt://localhost:8993')

        client.publish('test', 'test', { qos: 1 })
        client.end(true, done)
      })
    }
  })

  describe('publishing', function () {
    it('should publish a message (offline)', function (done) {
      var client = connect()
      var payload = 'test'
      var topic = 'test'

      client.publish(topic, payload)

      server.once('client', function (serverClient) {
        serverClient.once('publish', function (packet) {
          packet.topic.should.equal(topic)
          packet.payload.toString().should.equal(payload)
          packet.qos.should.equal(0)
          packet.retain.should.equal(false)
          client.end()
          done()
        })
      })
    })

    it('should publish a message (online)', function (done) {
      var client = connect()
      var payload = 'test'
      var topic = 'test'

      client.on('connect', function () {
        client.publish(topic, payload)
      })

      server.once('client', function (serverClient) {
        serverClient.once('publish', function (packet) {
          packet.topic.should.equal(topic)
          packet.payload.toString().should.equal(payload)
          packet.qos.should.equal(0)
          packet.retain.should.equal(false)
          client.end()
          done()
        })
      })
    })

    it('should publish a message (retain, offline)', function (done) {
      var client = connect({ queueQoSZero: true })
      var payload = 'test'
      var topic = 'test'
      var called = false

      client.publish(topic, payload, { retain: true }, function () {
        called = true
      })

      server.once('client', function (serverClient) {
        serverClient.once('publish', function (packet) {
          packet.topic.should.equal(topic)
          packet.payload.toString().should.equal(payload)
          packet.qos.should.equal(0)
          packet.retain.should.equal(true)
          called.should.equal(true)
          client.end()
          done()
        })
      })
    })

    it('should emit a packetsend event', function (done) {
      var client = connect()
      var payload = 'test_payload'
      var testTopic = 'testTopic'

      client.on('packetsend', function (packet) {
        if (packet.cmd === 'publish') {
          packet.qos.should.equal(0)
          packet.topic.should.equal(testTopic)
          packet.payload.should.equal(payload)
          packet.retain.should.equal(false)
          client.end()
          done()
        }
      })

      client.publish(testTopic, payload)
    })

    it('should accept options', function (done) {
      var client = connect()
      var payload = 'test'
      var topic = 'test'
      var opts = {
        retain: true,
        qos: 1
      }

      client.once('connect', function () {
        client.publish(topic, payload, opts)
      })

      server.once('client', function (serverClient) {
        serverClient.once('publish', function (packet) {
          packet.topic.should.equal(topic)
          packet.payload.toString().should.equal(payload)
          packet.qos.should.equal(opts.qos, 'incorrect qos')
          packet.retain.should.equal(opts.retain, 'incorrect ret')
          packet.dup.should.equal(false, 'incorrect dup')
          client.end()
          done()
        })
      })
    })

    it('should publish with the default options for an empty parameter', function (done) {
      var client = connect()
      var payload = 'test'
      var topic = 'test'
      var defaultOpts = {qos: 0, retain: false, dup: false}

      client.once('connect', function () {
        client.publish(topic, payload, {})
      })

      server.once('client', function (serverClient) {
        serverClient.once('publish', function (packet) {
          packet.topic.should.equal(topic)
          packet.payload.toString().should.equal(payload)
          packet.qos.should.equal(defaultOpts.qos, 'incorrect qos')
          packet.retain.should.equal(defaultOpts.retain, 'incorrect ret')
          packet.dup.should.equal(defaultOpts.dup, 'incorrect dup')
          client.end()
          done()
        })
      })
    })

    it('should mark a message as  duplicate when "dup" option is set', function (done) {
      var client = connect()
      var payload = 'duplicated-test'
      var topic = 'test'
      var opts = {
        retain: true,
        qos: 1,
        dup: true
      }

      client.once('connect', function () {
        client.publish(topic, payload, opts)
      })

      server.once('client', function (serverClient) {
        serverClient.once('publish', function (packet) {
          packet.topic.should.equal(topic)
          packet.payload.toString().should.equal(payload)
          packet.dup.should.equal(opts.dup, 'incorrect dup')
          client.end()
          done()
        })
      })
    })

    it('should fire a callback (qos 0)', function (done) {
      var client = connect()

      client.once('connect', function () {
        client.publish('a', 'b', function () {
          client.end()
          done()
        })
      })
    })

    it('should fire a callback (qos 1)', function (done) {
      var client = connect()
      var opts = { qos: 1 }

      client.once('connect', function () {
        client.publish('a', 'b', opts, function () {
          client.end()
          done()
        })
      })
    })

    it('should fire a callback (qos 2)', function (done) {
      var client = connect()
      var opts = { qos: 2 }

      client.once('connect', function () {
        client.publish('a', 'b', opts, function () {
          client.end()
          done()
        })
      })
    })

    it('should support UTF-8 characters in topic', function (done) {
      var client = connect()

      client.once('connect', function () {
        client.publish('中国', 'hello', function () {
          client.end()
          done()
        })
      })
    })

    it('should support UTF-8 characters in payload', function (done) {
      var client = connect()

      client.once('connect', function () {
        client.publish('hello', '中国', function () {
          client.end()
          done()
        })
      })
    })

    it('should publish 10 QoS 2 and receive them', function (done) {
      var client = connect()
      var count = 0

      client.on('connect', function () {
        client.subscribe('test')
        client.publish('test', 'test', { qos: 2 })
      })

      client.on('message', function () {
        if (count >= 10) {
          client.end()
          done()
        } else {
          client.publish('test', 'test', { qos: 2 })
        }
      })

      server.once('client', function (serverClient) {
        serverClient.on('offline', function () {
          client.end()
          done('error went offline... didnt see this happen')
        })

        serverClient.on('subscribe', function () {
          serverClient.on('publish', function (packet) {
            serverClient.publish(packet)
          })
        })

        serverClient.on('pubrel', function () {
          count++
        })
      })
    })

    function testQosHandleMessage (qos, done) {
      var client = connect()

      var messageEventCount = 0
      var handleMessageCount = 0

      client.handleMessage = function (packet, callback) {
        setTimeout(function () {
          handleMessageCount++
          // next message event should not emit until handleMessage completes
          handleMessageCount.should.equal(messageEventCount)
          if (handleMessageCount === 10) {
            setTimeout(function () {
              client.end()
              done()
            })
          }

          callback()
        }, 100)
      }

      client.on('message', function (topic, message, packet) {
        messageEventCount++
      })

      client.on('connect', function () {
        client.subscribe('test')
      })

      server.once('client', function (serverClient) {
        serverClient.on('offline', function () {
          client.end()
          done('error went offline... didnt see this happen')
        })

        serverClient.on('subscribe', function () {
          for (var i = 0; i < 10; i++) {
            serverClient.publish({
              messageId: i,
              topic: 'test',
              payload: 'test' + i,
              qos: qos
            })
          }
        })
      })
    }

    it('should publish 10 QoS 0 and receive them only when `handleMessage` finishes', function (done) {
      testQosHandleMessage(0, done)
    })

    it('should publish 10 QoS 1 and receive them only when `handleMessage` finishes', function (done) {
      testQosHandleMessage(1, done)
    })

    it('should publish 10 QoS 2 and receive them only when `handleMessage` finishes', function (done) {
      testQosHandleMessage(2, done)
    })
  })

  describe('unsubscribing', function () {
    it('should send an unsubscribe packet (offline)', function (done) {
      var client = connect()

      client.unsubscribe('test')

      server.once('client', function (serverClient) {
        serverClient.once('unsubscribe', function (packet) {
          packet.unsubscriptions.should.containEql('test')
          client.end()
          done()
        })
      })
    })

    it('should send an unsubscribe packet', function (done) {
      var client = connect()
      var topic = 'topic'

      client.once('connect', function () {
        client.unsubscribe(topic)
      })

      server.once('client', function (serverClient) {
        serverClient.once('unsubscribe', function (packet) {
          packet.unsubscriptions.should.containEql(topic)
          client.end()
          done()
        })
      })
    })

    it('should emit a packetsend event', function (done) {
      var client = connect()
      var testTopic = 'testTopic'

      client.once('connect', function () {
        client.subscribe(testTopic)
      })

      client.on('packetsend', function (packet) {
        if (packet.cmd === 'subscribe') {
          client.end()
          done()
        }
      })
    })

    it('should emit a packetreceive event', function (done) {
      var client = connect()
      var testTopic = 'testTopic'

      client.once('connect', function () {
        client.subscribe(testTopic)
      })

      client.on('packetreceive', function (packet) {
        if (packet.cmd === 'suback') {
          client.end()
          done()
        }
      })
    })

    it('should accept an array of unsubs', function (done) {
      var client = connect()
      var topics = ['topic1', 'topic2']

      client.once('connect', function () {
        client.unsubscribe(topics)
      })

      server.once('client', function (serverClient) {
        serverClient.once('unsubscribe', function (packet) {
          packet.unsubscriptions.should.eql(topics)
          done()
        })
      })
    })

    it('should fire a callback on unsuback', function (done) {
      var client = connect()
      var topic = 'topic'

      client.once('connect', function () {
        client.unsubscribe(topic, done)
      })

      server.once('client', function (serverClient) {
        serverClient.once('unsubscribe', function (packet) {
          serverClient.unsuback(packet)
          client.end()
        })
      })
    })

    it('should unsubscribe from a chinese topic', function (done) {
      var client = connect()
      var topic = '中国'

      client.once('connect', function () {
        client.unsubscribe(topic)
      })

      server.once('client', function (serverClient) {
        serverClient.once('unsubscribe', function (packet) {
          packet.unsubscriptions.should.containEql(topic)
          client.end()
          done()
        })
      })
    })
  })

  describe('keepalive', function () {
    var clock

    beforeEach(function () {
      clock = sinon.useFakeTimers()
    })

    afterEach(function () {
      clock.restore()
    })

    it('should checkPing at keepalive interval', function (done) {
      var interval = 3
      var client = connect({ keepalive: interval })

      client._checkPing = sinon.spy()

      client.once('connect', function () {
        clock.tick(interval * 1000)
        client._checkPing.callCount.should.equal(1)

        clock.tick(interval * 1000)
        client._checkPing.callCount.should.equal(2)

        clock.tick(interval * 1000)
        client._checkPing.callCount.should.equal(3)

        client.end()
        done()
      })
    })

    it('should not checkPing if publishing at a higher rate than keepalive', function (done) {
      var intervalMs = 3000
      var client = connect({keepalive: intervalMs / 1000})

      client._checkPing = sinon.spy()

      client.once('connect', function () {
        client.publish('foo', 'bar')
        clock.tick(intervalMs - 1)
        client.publish('foo', 'bar')
        clock.tick(2)
        client._checkPing.callCount.should.equal(0)
        client.end()
        done()
      })
    })

    it('should checkPing if publishing at a higher rate than keepalive and reschedulePings===false', function (done) {
      var intervalMs = 3000
      var client = connect({
        keepalive: intervalMs / 1000,
        reschedulePings: false
      })

      client._checkPing = sinon.spy()

      client.once('connect', function () {
        client.publish('foo', 'bar')
        clock.tick(intervalMs - 1)
        client.publish('foo', 'bar')
        clock.tick(2)
        client._checkPing.callCount.should.equal(1)
        client.end()
        done()
      })
    })
  })

  describe('pinging', function () {
    it('should set a ping timer', function (done) {
      var client = connect({keepalive: 3})
      client.once('connect', function () {
        should.exist(client.pingTimer)
        client.end()
        done()
      })
    })

    it('should not set a ping timer keepalive=0', function (done) {
      var client = connect({keepalive: 0})
      client.on('connect', function () {
        should.not.exist(client.pingTimer)
        client.end()
        done()
      })
    })

    it('should reconnect if pingresp is not sent', function (done) {
      var client = connect({keepalive: 1, reconnectPeriod: 100})

      // Fake no pingresp being send by stubbing the _handlePingresp function
      client._handlePingresp = function () {}

      client.once('connect', function () {
        client.once('connect', function () {
          client.end()
          done()
        })
      })
    })

    it('should not reconnect if pingresp is successful', function (done) {
      var client = connect({keepalive: 100})
      client.once('close', function () {
        done(new Error('Client closed connection'))
      })
      setTimeout(done, 1000)
    })

    it('should defer the next ping when sending a control packet', function (done) {
      var client = connect({keepalive: 1})

      client.once('connect', function () {
        client._checkPing = sinon.spy()

        client.publish('foo', 'bar')
        setTimeout(function () {
          client._checkPing.callCount.should.equal(0)
          client.publish('foo', 'bar')

          setTimeout(function () {
            client._checkPing.callCount.should.equal(0)
            client.publish('foo', 'bar')

            setTimeout(function () {
              client._checkPing.callCount.should.equal(0)
              done()
            }, 75)
          }, 75)
        }, 75)
      })
    })
  })

  describe('subscribing', function () {
    it('should send a subscribe message (offline)', function (done) {
      var client = connect()

      client.subscribe('test')

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function () {
          done()
        })
      })
    })

    it('should send a subscribe message', function (done) {
      var client = connect()
      var topic = 'test'

      client.once('connect', function () {
        client.subscribe(topic)
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function (packet) {
          packet.subscriptions.should.containEql({
            topic: topic,
            qos: 0
          })
          done()
        })
      })
    })

    it('should emit a packetsend event', function (done) {
      var client = connect()
      var testTopic = 'testTopic'

      client.once('connect', function () {
        client.subscribe(testTopic)
      })

      client.on('packetsend', function (packet) {
        if (packet.cmd === 'subscribe') {
          done()
        }
      })
    })

    it('should emit a packetreceive event', function (done) {
      var client = connect()
      var testTopic = 'testTopic'

      client.once('connect', function () {
        client.subscribe(testTopic)
      })

      client.on('packetreceive', function (packet) {
        if (packet.cmd === 'suback') {
          done()
        }
      })
    })

    it('should accept an array of subscriptions', function (done) {
      var client = connect()
      var subs = ['test1', 'test2']

      client.once('connect', function () {
        client.subscribe(subs)
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function (packet) {
          // i.e. [{topic: 'a', qos: 0}, {topic: 'b', qos: 0}]
          var expected = subs.map(function (i) {
            return {topic: i, qos: 0}
          })

          packet.subscriptions.should.eql(expected)
          done()
        })
      })
    })

    it('should accept an hash of subscriptions', function (done) {
      var client = connect()
      var topics = {
        test1: 0,
        test2: 1
      }

      client.once('connect', function () {
        client.subscribe(topics)
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function (packet) {
          var k
          var expected = []

          for (k in topics) {
            if (topics.hasOwnProperty(k)) {
              expected.push({
                topic: k,
                qos: topics[k]
              })
            }
          }

          packet.subscriptions.should.eql(expected)
          done()
        })
      })
    })

    it('should accept an options parameter', function (done) {
      var client = connect()
      var topic = 'test'
      var opts = {qos: 1}

      client.once('connect', function () {
        client.subscribe(topic, opts)
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function (packet) {
          var expected = [{
            topic: topic,
            qos: 1
          }]

          packet.subscriptions.should.eql(expected)
          done()
        })
      })
    })

    it('should subscribe with the default options for an empty options parameter', function (done) {
      var client = connect()
      var topic = 'test'
      var defaultOpts = {qos: 0}

      client.once('connect', function () {
        client.subscribe(topic, {})
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function (packet) {
          packet.subscriptions.should.containEql({
            topic: topic,
            qos: defaultOpts.qos
          })
          done()
        })
      })
    })

    it('should fire a callback on suback', function (done) {
      var client = connect()
      var topic = 'test'

      client.once('connect', function () {
        client.subscribe(topic, { qos: 2 }, function (err, granted) {
          if (err) {
            done(err)
          } else {
            should.exist(granted, 'granted not given')
            granted.should.containEql({topic: 'test', qos: 2})
            done()
          }
        })
      })
    })

    it('should fire a callback with error if disconnected (options provided)', function (done) {
      var client = connect()
      var topic = 'test'
      client.once('connect', function () {
        client.end(true, function () {
          client.subscribe(topic, {qos: 2}, function (err, granted) {
            should.not.exist(granted, 'granted given')
            should.exist(err, 'no error given')
            done()
          })
        })
      })
    })

    it('should fire a callback with error if disconnected (options not provided)', function (done) {
      var client = connect()
      var topic = 'test'

      client.once('connect', function () {
        client.end(true, function () {
          client.subscribe(topic, function (err, granted) {
            should.not.exist(granted, 'granted given')
            should.exist(err, 'no error given')
            done()
          })
        })
      })
    })

    it('should subscribe with a chinese topic', function (done) {
      var client = connect()
      var topic = '中国'

      client.once('connect', function () {
        client.subscribe(topic)
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function (packet) {
          packet.subscriptions.should.containEql({
            topic: topic,
            qos: 0
          })
          done()
        })
      })
    })
  })

  describe('receiving messages', function () {
    it('should fire the message event', function (done) {
      var client = connect()
      var testPacket = {
        topic: 'test',
        payload: 'message',
        retain: true,
        qos: 1,
        messageId: 5
      }

      client.subscribe(testPacket.topic)
      client.once('message', function (topic, message, packet) {
        topic.should.equal(testPacket.topic)
        message.toString().should.equal(testPacket.payload)
        packet.should.equal(packet)
        client.end()
        done()
      })

      server.once('client', function (serverClient) {
        serverClient.on('subscribe', function () {
          serverClient.publish(testPacket)
        })
      })
    })

    it('should emit a packetreceive event', function (done) {
      var client = connect()
      var testPacket = {
        topic: 'test',
        payload: 'message',
        retain: true,
        qos: 1,
        messageId: 5
      }

      client.subscribe(testPacket.topic)
      client.on('packetreceive', function (packet) {
        if (packet.cmd === 'publish') {
          packet.qos.should.equal(1)
          packet.topic.should.equal(testPacket.topic)
          packet.payload.toString().should.equal(testPacket.payload)
          packet.retain.should.equal(true)
          client.end()
          done()
        }
      })

      server.once('client', function (serverClient) {
        serverClient.on('subscribe', function () {
          serverClient.publish(testPacket)
        })
      })
    })

    it('should support binary data', function (done) {
      var client = connect({ encoding: 'binary' })
      var testPacket = {
        topic: 'test',
        payload: 'message',
        retain: true,
        qos: 1,
        messageId: 5
      }

      client.subscribe(testPacket.topic)
      client.once('message', function (topic, message, packet) {
        topic.should.equal(testPacket.topic)
        message.should.be.an.instanceOf(Buffer)
        message.toString().should.equal(testPacket.payload)
        packet.should.equal(packet)
        done()
      })

      server.once('client', function (serverClient) {
        serverClient.on('subscribe', function () {
          serverClient.publish(testPacket)
        })
      })
    })

    it('should emit a message event (qos=2)', function (done) {
      var client = connect()
      var testPacket = {
        topic: 'test',
        payload: 'message',
        retain: true,
        qos: 2,
        messageId: 5
      }

      server.testPublish = testPacket

      client.subscribe(testPacket.topic)
      client.once('message', function (topic, message, packet) {
        topic.should.equal(testPacket.topic)
        message.toString().should.equal(testPacket.payload)
        packet.should.equal(packet)
        done()
      })

      server.once('client', function (serverClient) {
        serverClient.on('subscribe', function () {
          serverClient.publish(testPacket)
        })
      })
    })

    it('should emit a message event (qos=2) - repeated publish', function (done) {
      var client = connect()
      var testPacket = {
        topic: 'test',
        payload: 'message',
        retain: true,
        qos: 2,
        messageId: 5
      }

      server.testPublish = testPacket

      client.subscribe(testPacket.topic)
      client.on('message', function (topic, message, packet) {
        topic.should.equal(testPacket.topic)
        message.toString().should.equal(testPacket.payload)
        packet.should.equal(packet)
        done()
      })

      server.once('client', function (serverClient) {
        serverClient.on('subscribe', function () {
          serverClient.publish(testPacket)
          // twice, should be ignored
          serverClient.publish(testPacket)
        })
      })
    })

    it('should support chinese topic', function (done) {
      var client = connect({ encoding: 'binary' })
      var testPacket = {
        topic: '国',
        payload: 'message',
        retain: true,
        qos: 1,
        messageId: 5
      }

      client.subscribe(testPacket.topic)
      client.once('message', function (topic, message, packet) {
        topic.should.equal(testPacket.topic)
        message.should.be.an.instanceOf(Buffer)
        message.toString().should.equal(testPacket.payload)
        packet.should.equal(packet)
        done()
      })

      server.once('client', function (serverClient) {
        serverClient.on('subscribe', function () {
          serverClient.publish(testPacket)
        })
      })
    })
  })

  describe('qos handling', function () {
    it('should follow qos 0 semantics (trivial)', function (done) {
      var client = connect()
      var testTopic = 'test'
      var testMessage = 'message'

      client.once('connect', function () {
        client.subscribe(testTopic, {qos: 0})
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function () {
          serverClient.publish({
            topic: testTopic,
            payload: testMessage,
            qos: 0,
            retain: false
          })
          done()
        })
      })
    })

    it('should follow qos 1 semantics', function (done) {
      var client = connect()
      var testTopic = 'test'
      var testMessage = 'message'
      var mid = 50

      client.once('connect', function () {
        client.subscribe(testTopic, {qos: 1})
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function () {
          serverClient.publish({
            topic: testTopic,
            payload: testMessage,
            messageId: mid,
            qos: 1
          })
        })

        serverClient.once('puback', function (packet) {
          packet.messageId.should.equal(mid)
          done()
        })
      })
    })

    it('should follow qos 2 semantics', function (done) {
      var client = connect()
      var testTopic = 'test'
      var testMessage = 'message'
      var mid = 253

      client.once('connect', function () {
        client.subscribe(testTopic, {qos: 2})
      })

      server.once('client', function (serverClient) {
        serverClient.once('subscribe', function () {
          serverClient.publish({
            topic: testTopic,
            payload: testMessage,
            qos: 2,
            messageId: mid
          })
        })

        serverClient.once('pubcomp', function () {
          done()
        })
      })
    })
  })

  describe('auto reconnect', function () {
    it('should mark the client disconnecting if #end called', function () {
      var client = connect()

      client.end()
      client.disconnecting.should.eql(true)
    })

    it('should reconnect after stream disconnect', function (done) {
      var client = connect()
      var tryReconnect = true

      client.on('connect', function () {
        if (tryReconnect) {
          client.stream.end()
          tryReconnect = false
        } else {
          client.end()
          done()
        }
      })
    })

    it('should emit \'reconnect\' when reconnecting', function (done) {
      var client = connect()
      var tryReconnect = true
      var reconnectEvent = false

      client.on('reconnect', function () {
        reconnectEvent = true
      })

      client.on('connect', function () {
        if (tryReconnect) {
          client.stream.end()
          tryReconnect = false
        } else {
          reconnectEvent.should.equal(true)
          client.end()
          done()
        }
      })
    })

    it('should emit \'offline\' after going offline', function (done) {
      var client = connect()
      var tryReconnect = true
      var offlineEvent = false

      client.on('offline', function () {
        offlineEvent = true
      })

      client.on('connect', function () {
        if (tryReconnect) {
          client.stream.end()
          tryReconnect = false
        } else {
          offlineEvent.should.equal(true)
          client.end()
          done()
        }
      })
    })

    it('should not reconnect if it was ended by the user', function (done) {
      var client = connect()

      client.on('connect', function () {
        client.end()
        done() // it will raise an exception if called two times
      })
    })

    it('should setup a reconnect timer on disconnect', function (done) {
      var client = connect()

      client.once('connect', function () {
        should.not.exist(client.reconnectTimer)
        client.stream.end()
      })

      client.once('close', function () {
        should.exist(client.reconnectTimer)
        client.end()
        done()
      })
    })

    it('should allow specification of a reconnect period', function (done) {
      var end
      var period = 200
      var client = connect({reconnectPeriod: period})
      var reconnect = false
      var start = Date.now()

      client.on('connect', function () {
        if (!reconnect) {
          client.stream.end()
          reconnect = true
        } else {
          client.end()
          end = Date.now()
          if (end - start >= period) {
            // Connected in about 2 seconds, that's good enough
            done()
          } else {
            done(new Error('Strange reconnect period'))
          }
        }
      })
    })

    it('should resend in-flight QoS 1 publish messages from the client', function (done) {
      var client = connect({reconnectPeriod: 200})
      var serverPublished = false
      var clientCalledBack = false

      server.once('client', function (serverClient) {
        serverClient.on('connect', function () {
          setImmediate(function () {
            serverClient.stream.destroy()
          })
        })

        server.once('client', function (serverClientNew) {
          serverClientNew.on('publish', function () {
            serverPublished = true
            check()
          })
        })
      })

      client.publish('hello', 'world', { qos: 1 }, function () {
        clientCalledBack = true
        check()
      })

      function check () {
        if (serverPublished && clientCalledBack) {
          client.end()
          done()
        }
      }
    })

    it('should resend in-flight QoS 2 publish messages from the client', function (done) {
      var client = connect({reconnectPeriod: 200})
      var serverPublished = false
      var clientCalledBack = false

      server.once('client', function (serverClient) {
        // ignore errors
        serverClient.on('error', function () {})
        serverClient.on('publish', function () {
          setImmediate(function () {
            serverClient.stream.destroy()
          })
        })

        server.once('client', function (serverClientNew) {
          serverClientNew.on('pubrel', function () {
            serverPublished = true
            check()
          })
        })
      })

      client.publish('hello', 'world', { qos: 2 }, function () {
        clientCalledBack = true
        check()
      })

      function check () {
        if (serverPublished && clientCalledBack) {
          client.end()
          done()
        }
      }
    })

    it('should not resend in-flight QoS 1 removed publish messages from the client', function (done) {
      var client = connect({reconnectPeriod: 200})
      var clientCalledBack = false

      server.once('client', function (serverClient) {
        serverClient.on('connect', function () {
          setImmediate(function () {
            serverClient.stream.destroy()
          })
        })

        server.once('client', function (serverClientNew) {
          serverClientNew.on('publish', function () {
            should.fail()
            done()
          })
        })
      })

      client.publish('hello', 'world', { qos: 1 }, function (err) {
        clientCalledBack = true
        should(err.message).be.equal('Message removed')
      })
      should(Object.keys(client.outgoing).length).be.equal(1)
      should(Object.keys(client.outgoingStore._inflights).length).be.equal(1)
      client.removeOutgoingMessage(client.getLastMessageId())
      should(Object.keys(client.outgoing).length).be.equal(0)
      should(Object.keys(client.outgoingStore._inflights).length).be.equal(0)
      clientCalledBack.should.be.true()
      client.end()
      done()
    })

    it('should not resend in-flight QoS 2 removed publish messages from the client', function (done) {
      var client = connect({reconnectPeriod: 200})
      var clientCalledBack = false

      server.once('client', function (serverClient) {
        serverClient.on('connect', function () {
          setImmediate(function () {
            serverClient.stream.destroy()
          })
        })

        server.once('client', function (serverClientNew) {
          serverClientNew.on('publish', function () {
            should.fail()
            done()
          })
        })
      })

      client.publish('hello', 'world', { qos: 2 }, function (err) {
        clientCalledBack = true
        should(err.message).be.equal('Message removed')
      })
      should(Object.keys(client.outgoing).length).be.equal(1)
      should(Object.keys(client.outgoingStore._inflights).length).be.equal(1)
      client.removeOutgoingMessage(client.getLastMessageId())
      should(Object.keys(client.outgoing).length).be.equal(0)
      should(Object.keys(client.outgoingStore._inflights).length).be.equal(0)
      clientCalledBack.should.be.true()
      client.end()
      done()
    })

    it('should resubscribe when reconnecting', function (done) {
      var client = connect({ reconnectPeriod: 100 })
      var tryReconnect = true
      var reconnectEvent = false

      client.on('reconnect', function () {
        reconnectEvent = true
      })

      client.on('connect', function () {
        if (tryReconnect) {
          client.subscribe('hello', function () {
            client.stream.end()

            server.once('client', function (serverClient) {
              serverClient.on('subscribe', function () {
                client.end()
                done()
              })
            })
          })

          tryReconnect = false
        } else {
          reconnectEvent.should.equal(true)
        }
      })
    })

    it('should not resubscribe when reconnecting if resubscribe is disabled', function (done) {
      var client = connect({ reconnectPeriod: 100, resubscribe: false })
      var tryReconnect = true
      var reconnectEvent = false

      client.on('reconnect', function () {
        reconnectEvent = true
      })

      client.on('connect', function () {
        if (tryReconnect) {
          client.subscribe('hello', function () {
            client.stream.end()

            server.once('client', function (serverClient) {
              serverClient.on('subscribe', function () {
                should.fail()
              })
            })
          })

          tryReconnect = false
        } else {
          reconnectEvent.should.equal(true)
          should(Object.keys(client._resubscribeTopics).length).be.equal(0)
          done()
        }
      })
    })

    it('should not resubscribe when reconnecting if suback is error', function (done) {
      var tryReconnect = true
      var reconnectEvent = false
      var server2 = new Server(function (c) {
        c.on('connect', function (packet) {
          c.connack({returnCode: 0})
        })
        c.on('subscribe', function (packet) {
          c.suback({
            messageId: packet.messageId,
            granted: packet.subscriptions.map(function (e) {
              return e.qos | 0x80
            })
          })
          c.pubrel({ messageId: Math.floor(Math.random() * 9000) + 1000 })
        })
      })

      server2.listen(port + 49, function () {
        var client = mqtt.connect({
          port: port + 49,
          host: 'localhost',
          reconnectPeriod: 100
        })

        client.on('reconnect', function () {
          reconnectEvent = true
        })

        client.on('connect', function () {
          if (tryReconnect) {
            client.subscribe('hello', function () {
              client.stream.end()

              server.once('client', function (serverClient) {
                serverClient.on('subscribe', function () {
                  should.fail()
                })
              })
            })
            tryReconnect = false
          } else {
            reconnectEvent.should.equal(true)
            should(Object.keys(client._resubscribeTopics).length).be.equal(0)
            server2.close()
            done()
          }
        })
      })
    })

    context('with alternate server client', function () {
      var cachedClientListeners

      beforeEach(function () {
        cachedClientListeners = server.listeners('client')
        server.removeAllListeners('client')
      })

      afterEach(function () {
        server.removeAllListeners('client')
        cachedClientListeners.forEach(function (listener) {
          server.on('client', listener)
        })
      })

      it('should resubscribe even if disconnect is before suback', function (done) {
        var client = mqtt.connect(Object.assign({ reconnectPeriod: 100 }, config))
        var subscribeCount = 0
        var connectCount = 0

        server.on('client', function (serverClient) {
          serverClient.on('connect', function () {
            connectCount++
            serverClient.connack({returnCode: 0})
          })

          serverClient.on('subscribe', function () {
            subscribeCount++

            // disconnect before sending the suback on the first subscribe
            if (subscribeCount === 1) {
              client.stream.end()
            }

            // after the second connection, confirm that the only two
            // subscribes have taken place, then cleanup and exit
            if (connectCount >= 2) {
              subscribeCount.should.equal(2)
              client.end(true, done)
            }
          })
        })

        client.subscribe('hello')
      })

      it('should resubscribe exactly once', function (done) {
        var client = mqtt.connect(Object.assign({ reconnectPeriod: 100 }, config))
        var subscribeCount = 0

        server.on('client', function (serverClient) {
          serverClient.on('connect', function () {
            serverClient.connack({returnCode: 0})
          })

          serverClient.on('subscribe', function () {
            subscribeCount++

            // disconnect before sending the suback on the first subscribe
            if (subscribeCount === 1) {
              client.stream.end()
            }

            // after the second connection, only two subs
            // subscribes have taken place, then cleanup and exit
            if (subscribeCount === 2) {
              client.end(true, done)
            }
          })
        })

        client.subscribe('hello')
      })
    })
  })
}
