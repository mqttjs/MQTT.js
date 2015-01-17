
/**
 * Testing dependencies
 */
var should        = require('should')
  , sinon         = require('sinon')
  , mqtt          = require('../')
  , MqttClient    = require('../lib/client')
  , setImmediate  = global.setImmediate || function(callback) {
      // for node v0.8 support
      process.nextTick(callback);
    };

module.exports = function(server, config) {
  function connect(opts) {
    opts = Object.keys(config).reduce(function(acc, key) {
      acc[key] = config[key];
      return acc;
    }, opts || {});

    return mqtt.connect(opts);
  }

  describe('closing', function() {
    it('should emit close if stream closes', function(done) {
      var client = connect();

      client.once('connect', function() {
        client.stream.end();
      });
      client.once('close', function() {
        client.end()
        done();
      });
    });

    it('should mark the client as disconnected', function(done) {
      var client = connect();

      client.once('close', function() {
        client.end();
        if (!client.connected) {
          done();
        } else {
          done(new Error('Not marked as disconnected'));
        }
      });
      client.once('connect', function() {
        client.stream.end();
      });
    });

    it('should stop ping timer if stream closes', function(done) {
      var client = connect();

      client.once('close', function() {
        should.not.exist(client.pingTimer);
        client.end();
        done();
      });

      client.once('connect', function() {
        should.exist(client.pingTimer);
        client.stream.end();
      });
    });

    it('should emit close after end called', function(done) {
      var client = connect();

      client.once('close', function() {
        done();
      });

      client.once('connect', function() {
        client.end();
      });

    });

    it('should stop ping timer after end called', function(done) {
      var client = connect();

      client.once('connect', function() {
        should.exist(client.pingTimer);
        client.end();
        should.not.exist(client.pingTimer);
        done();
      });

    });
  });

  describe('connecting', function() {

    it('should connect to the broker', function (done) {
      var client = connect();

      server.once('client', function(client) {
        client.disconnect()
        done();
      });
    });

    it('should send a default client id', function (done) {
      var client = connect();

      server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clientId.should.match(/mqttjs.*/);
          client.disconnect()
          done();
        });
      });
    });

    it('should send be clean by default', function (done) {
      var client = connect();

      server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clean.should.be.true;
          client.disconnect();
          done();
        });
      });
    });

    it('should connect with the given client id', function (done) {
      var client = connect({clientId: 'testclient'});

      server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clientId.should.match(/testclient/);
          client.disconnect();
          done();
        });
      });
    });

    it('should connect with the client id and unclean state', function (done) {
      var client = connect({clientId: 'testclient', clean: false});

      server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clientId.should.match(/testclient/);
          packet.clean.should.be.false;
          client.disconnect();
          done();
        });
      });
    });

    it('should require a clientId with clean=false', function (done) {
      try {
        var client = connect({ clean: false });
        done(new Error('should have thrown'));
      } catch(err) {
        done();
      }
    });

    it('should default to localhost', function (done) {
      var client = connect({clientId: 'testclient'});

      server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clientId.should.match(/testclient/);
          client.disconnect();
          done();
        });
      });
    });

    it('should emit connect', function (done) {
      var client = connect();
      client.once('connect', function() {
        client.end();
        done();
      });
      client.once('error', done);
    });

    it('should mark the client as connected', function(done) {
      var client = connect();
      client.once('connect', function() {
        if (client.connected) {
          done();
        } else {
          done(new Error('Not marked as connected'));
        }
        client.end();
      });
    });

    it('should emit error', function (done) {
      var client = connect({clientId: 'invalid'});
      client.once('connect', function () {
        done(new Error('Should not emit connect'));
      });
      client.once('error', function(error) {
        client.end();
        done();
      });
    });

    it('should have different client ids', function() {
      var client1 = connect()
        , client2 = connect();

      client1.options.clientId.should.not.equal(client2.options.clientId);
      client1.end();
      client2.end();
    });
  });

  describe('offline messages', function() {

    it('should queue message until connected', function(done) {
      var client = connect();

      client.publish('test', 'test');
      client.subscribe('test');
      client.unsubscribe('test');
      client.queue.length.should.equal(3);

      client.once('connect', function() {
        client.queue.length.should.equal(0);
        done();
      });
    });

    if (!process.env.TRAVIS) {
      it('should queue message until connected', function(done) {
        var client = connect();

        client.subscribe('test');
        client.publish('test', 'test');
        client.queue.length.should.equal(2);

        client.on('queueEmpty', client.end.bind(client));

        server.once('client', function(client) {
          client.on('subscribe', function() {
            client.on('publish', function(packet) {
              done();
            });
          });
        });
      });

      it('should delay closing everything up until the queue is depleted', function(done) {
        var client = connect();

        client.subscribe('test');
        client.publish('test', 'test');
        client.end()

        client.once('message', function() {
          done();
        });

        server.once('client', function(client) {
          client.on('subscribe', function() {
            client.on('publish', function(packet) {
              client.publish(packet);
            });
          });
        });
      });

      it('should delay ending up until all inflight messages are delivered', function(done) {
        var client = connect();

        client.on('connect', function() {
          client.subscribe('test', function() {
            done();
          });
          client.publish('test', 'test', function() {
            client.end();
          });
        });
      });

      it('wait QoS 1 publish messages', function(done) {
        var client = connect();

        client.on('connect', function() {
          client.subscribe('test');
          client.publish('test', 'test', { qos: 1 }, function() {
            client.end();
          });
          client.on('message', function(t, p, packet) {
            done();
          });
        });

        server.once('client', function(client) {
          client.on('subscribe', function() {
            client.on('publish', function(packet) {
              client.publish(packet);
            });
          });
        });
      });
    }
  });

  describe('publishing', function() {
    it('should publish a message (offline)', function (done) {
      var client = connect()
        , payload = 'test'
        , topic = 'test';

      client.publish(topic, payload);

      server.once('client', function(client) {
        client.once('publish', function (packet) {
          packet.topic.should.equal(topic);
          packet.payload.toString().should.equal(payload);
          packet.qos.should.equal(0);
          packet.retain.should.equal(false);
          done();
        });
      });
    });

    it('should publish a message (online)', function (done) {
      var client = connect()
        , payload = 'test'
        , topic = 'test';

      client.on('connect', function() {
        client.publish(topic, payload);
      });

      server.once('client', function(client) {
        client.once('publish', function (packet) {
          packet.topic.should.equal(topic);
          packet.payload.toString().should.equal(payload);
          packet.qos.should.equal(0);
          packet.retain.should.equal(false);
          done();
        });
      });
    });

    it('should accept options', function (done) {
      var client = connect()
        , payload = 'test'
        , topic = 'test';

      var opts = {
        retain: true,
        qos: 1
      }

      client.once('connect', function() {
        client.publish(topic, payload, opts);
      });

      server.once('client', function(client) {
        client.once('publish', function (packet) {
          packet.topic.should.equal(topic);
          packet.payload.toString().should.equal(payload);
          packet.qos.should.equal(opts.qos, 'incorrect qos');
          packet.retain.should.equal(opts.retain, 'incorrect ret');
          done();
        });
      });
    });

    it('should fire a callback (qos 0)', function (done) {
      var client = connect();

      client.once('connect', function() {
        client.publish('a', 'b', done);
      });
    });

    it('should fire a callback (qos 1)', function (done) {
      var client = connect();

      var opts = {qos: 1};

      client.once('connect', function() {
        client.publish('a', 'b', opts, done);
      });
    });

    it('should fire a callback (qos 2)', function (done) {
      var client = connect();

      var opts = {qos: 2};

      client.once('connect', function() {
        client.publish('a', 'b', opts, done);
      });
    });

    it('should support UTF-8 characters in topic', function(done) {
      var client = connect();

      client.once('connect', function() {
        client.publish('中国', 'hello', done);
      });
    })

    it('should support UTF-8 characters in payload', function(done) {
      var client = connect();

      client.once('connect', function() {
        client.publish('hello', '中国', done);
      });
    })
  });

  describe('unsubscribing', function() {
    it('should send an unsubscribe packet (offline)', function(done) {
      var client = connect();

      client.unsubscribe('test');

      server.once('client', function(client) {
        client.once('unsubscribe', function(packet) {
          packet.unsubscriptions.should.containEql('test');
          done();
        });
      });
    });

    it('should send an unsubscribe packet', function(done) {
      var client = connect();
      var topic = 'topic';

      client.once('connect', function() {
        client.unsubscribe(topic);
      });

      server.once('client', function(client) {
        client.once('unsubscribe', function(packet) {
          packet.unsubscriptions.should.containEql(topic);
          done();
        });
      });
    });

    it('should accept an array of unsubs', function(done) {
      var client = connect();

      var topics = ['topic1', 'topic2'];

      client.once('connect', function() {
        client.unsubscribe(topics);
      });

      server.once('client', function(client) {
        client.once('unsubscribe', function(packet) {
          packet.unsubscriptions.should.eql(topics);
          done();
        });
      });
    });

    it('should fire a callback on unsuback', function(done) {
      var client = connect();

      var topic = 'topic';

      client.once('connect', function() {
        client.unsubscribe(topic, done);
      });

      server.once('client', function(client) {
        client.once('unsubscribe', function(packet) {
          client.unsuback(packet);
        });
      });
    });

    it('should unsubscribe from a chinese topic', function(done) {
      var client = connect();
      var topic = '中国';

      client.once('connect', function() {
        client.unsubscribe(topic);
      });

      server.once('client', function(client) {
        client.once('unsubscribe', function(packet) {
          packet.unsubscriptions.should.containEql(topic);
          done();
        });
      });
    });
  });

  describe('keepalive', function () {
    var clock;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock.restore();
    });

    it('should checkPing at keepalive interval', function (done) {
      var interval = 3,
      client = connect({keepalive: interval});

      client._checkPing = sinon.spy();

      client.once('connect', function() {

        clock.tick(interval * 1000);
        client._checkPing.callCount.should.equal(1);

        clock.tick(interval * 1000);
        client._checkPing.callCount.should.equal(2);

        clock.tick(interval * 1000);
        client._checkPing.callCount.should.equal(3);

        client.end()
        done();
      });
    });
  });

  describe('pinging', function () {

    it('should set a ping timer', function (done) {
      var client = connect({keepalive: 3});
      client.once('connect', function() {
        should.exist(client.pingTimer);
        client.end()
        done();
      });
    });
    it('should not set a ping timer keepalive=0', function(done) {
      var client = connect({keepalive:0});
      client.on('connect', function() {
        should.not.exist(client.pingTimer);
        client.end()
        done();
      });
    });
    it('should reconnect if pingresp is not sent', function(done) {
      var client = connect({keepalive:1, reconnectPeriod: 50});

      // Fake no pingresp being send by stubbing the _handlePingresp function
      client._handlePingresp = function () {};

      client.once('connect', function() {
        client.once('connect', function() {
          client.end()
          done();
        });
      });
    });
    it('should not reconnect if pingresp is successful', function(done) {
      var client = connect({keepalive:100});
      client.once('close', function() {
        done(new Error('Client closed connection'));
      });
      setTimeout(done, 1000);
    });
  });

  describe('subscribing', function () {
    it('should send a subscribe message (offline)', function(done) {
      var client = connect();

      client.subscribe('test');

      server.once('client', function(client) {
        client.once('subscribe', function(packet) {
          done();
        });
      });
    });

    it('should send a subscribe message', function(done) {
      var client = connect();

      var topic = 'test';

      client.once('connect', function() {
        client.subscribe(topic);
      });

      server.once('client', function(client) {
        client.once('subscribe', function(packet) {
          packet.subscriptions.should.containEql({
            topic: topic,
            qos: 0
          });
          done();
        });
      });
    });

    it('should accept an array of subscriptions', function(done) {
      var client = connect();

      var subs = ['test1', 'test2'];

      client.once('connect', function(args) {
        client.subscribe(subs);
      });

      server.once('client', function(client) {
        client.once('subscribe', function(packet) {
          // i.e. [{topic: 'a', qos: 0}, {topic: 'b', qos: 0}]
          var expected = subs.map(function (i) {
            return {topic: i, qos: 0};
          });

          packet.subscriptions.should.eql(expected);
          done();
        });
      });
    });

    it('should accept an hash of subscriptions', function(done) {
      var client = connect();

      var topics = {'test1': 0, 'test2': 1}

      client.once('connect', function() {
        client.subscribe(topics);
      });

      server.once('client', function(client) {
        client.once('subscribe', function(packet) {
          var expected = [];

          for (var k in topics) {
            if (topics.hasOwnProperty(k)) {
              expected.push({
                topic: k,
                qos: topics[k]
              });
            }
          }

          packet.subscriptions.should.eql(expected);
          done();
        });
      });
    });

    it('should accept an options parameter', function(done) {
      var client = connect();

      var topic = 'test'
        , opts = {qos: 1};

      client.once('connect', function(args) {
        client.subscribe(topic, opts);
      });

      server.once('client', function(client) {
        client.once('subscribe', function(packet) {
          var expected = [{topic: topic, qos: 1}]

          packet.subscriptions.should.eql(expected);
          done();
        });
      });
    });

    it('should fire a callback on suback', function(done) {
      var client = connect();

      var topic = 'test';

      client.once('connect', function(args) {
        client.subscribe(topic, {qos:2}, function (err, granted) {
          if (err) {
            done(err);
          } else {
            should.exist(granted, 'granted not given');
            granted.should.containEql({topic: 'test', qos: 2});
            done();
          }
        });
      });
    });

    it('should subscribe with a chinese topic', function(done) {
      var client = connect();

      var topic = '中国';

      client.once('connect', function() {
        client.subscribe(topic);
      });

      server.once('client', function(client) {
        client.once('subscribe', function(packet) {
          packet.subscriptions.should.containEql({
            topic: topic,
            qos: 0
          });
          done();
        });
      });
    });
  });

  describe('receiving messages', function() {
    it('should fire the message event', function(done) {
      var client = connect()
        , testPacket = {
          topic: 'test',
          payload: 'message',
          retain: true,
          qos: 1,
          messageId: 5
        };

      client.subscribe(testPacket.topic);
      client.once('message',
          function(topic, message, packet) {
        topic.should.equal(testPacket.topic);
        message.toString().should.equal(testPacket.payload);
        packet.should.equal(packet);
        done();
      });

      server.once('client', function(client) {
        client.on('subscribe', function(packet) {
          client.publish(testPacket);
        });
      });
    });

    it('should support binary data', function(done) {
      var client = connect({ encoding: 'binary' })
        , testPacket = {
            topic: 'test',
            payload: 'message',
            retain: true,
            qos: 1,
            messageId: 5
          };

      client.subscribe(testPacket.topic);
      client.once('message',
          function(topic, message, packet) {
        topic.should.equal(testPacket.topic);
        message.should.be.an.instanceOf(Buffer);
        message.toString().should.equal(testPacket.payload);
        packet.should.equal(packet);
        done();
      });

      server.once('client', function(client) {
        client.on('subscribe', function(packet) {
          client.publish(testPacket);
        });
      });
    });

    it('should emit a message event (qos=2)', function(done) {
      var client = connect()
        , testPacket = {
          topic: 'test',
          payload: 'message',
          retain: true,
          qos: 2,
          messageId: 5
        };

      server.testPublish = testPacket;

      client.subscribe(testPacket.topic);
      client.once('message',
          function(topic, message, packet) {
        topic.should.equal(testPacket.topic);
        message.toString().should.equal(testPacket.payload);
        packet.should.equal(packet);
        done();
      });

      server.once('client', function(client) {
        client.on('subscribe', function(packet) {
          client.publish(testPacket);
        });
      });
    });

    it('should emit a message event (qos=2) - repeated publish', function(done) {
      var client = connect()
        , testPacket = {
          topic: 'test',
          payload: 'message',
          retain: true,
          qos: 2,
          messageId: 5
        };

      server.testPublish = testPacket;

      client.subscribe(testPacket.topic);
      client.on('message',
          function(topic, message, packet) {
        topic.should.equal(testPacket.topic);
        message.toString().should.equal(testPacket.payload);
        packet.should.equal(packet);
        done();
      });

      server.once('client', function(client) {
        client.on('subscribe', function(packet) {
          client.publish(testPacket);
          // twice, should be ignored
          client.publish(testPacket);
        });
      });
    });

    it('should support chinese topic', function(done) {
      var client = connect({ encoding: 'binary' })
        , testPacket = {
            topic: '国',
            payload: 'message',
            retain: true,
            qos: 1,
            messageId: 5
          };

      client.subscribe(testPacket.topic);
      client.once('message',
          function(topic, message, packet) {
        topic.should.equal(testPacket.topic);
        message.should.be.an.instanceOf(Buffer);
        message.toString().should.equal(testPacket.payload);
        packet.should.equal(packet);
        done();
      });

      server.once('client', function(client) {
        client.on('subscribe', function(packet) {
          client.publish(testPacket);
        });
      });
    });
  });

  describe('qos handling', function() {

    it('should follow qos 0 semantics (trivial)', function(done) {
      var client = connect()
        , test_topic = 'test'
        , test_message = 'message';

      client.once('connect', function() {
        client.subscribe(test_topic, {qos: 0});
      });

      server.once('client', function(client) {
        client.once('subscribe', function (packet) {
          client.publish({
            topic: test_topic,
            payload: test_message,
            qos: 0,
            retain: false
          });
          done();
        });
      });
    });

    it('should follow qos 1 semantics', function(done) {
      var client = connect()
        , test_topic = 'test'
        , test_message = 'message'
        , mid = 50;

      client.once('connect', function(args) {
        client.subscribe(test_topic, {qos: 1});
      });

      server.once('client', function(client) {
        client.once('subscribe', function (packet) {
          client.publish({
            topic: test_topic,
            payload: test_message,
            messageId: mid,
            qos: 1
          });
        });

        client.once('puback', function(packet) {
          packet.messageId.should.equal(mid);
          done();
        });
      });
    });

    it('should follow qos 2 semantics', function(done) {
      var client = connect()
        , test_topic = 'test'
        , test_message = 'message'
        , mid = 253;

      client.once('connect', function() {
        client.subscribe(test_topic, {qos: 2});
      });

      server.once('client', function(client) {
        client.once('subscribe', function (packet) {
          client.publish({
            topic: test_topic,
            payload: test_message,
            qos: 2,
            messageId: mid
          });
        });

        client.once('pubcomp', function(packet) {
          done();
        });
      });
    });
  });

  describe('auto reconnect', function() {
    it('should mark the client disconnecting if #end called', function() {
      var client = connect();

      client.end();
      client.disconnecting.should.eql(true);
    });

    it('should reconnect after stream disconnect', function(done) {
      var client = connect()
        , tryReconnect = true;

      client.on('connect', function() {
        if (tryReconnect) {
          client.stream.end();
          tryReconnect = false;
        } else {
          done();
        }
      });
    });

    it('should emit \'reconnect\' when reconnecting', function(done) {
      var client = connect()
        , tryReconnect = true
        , reconnectEvent = false;

      client.on('reconnect', function() {
        reconnectEvent = true;
      });

      client.on('connect', function() {
        if (tryReconnect) {
          client.stream.end();
          tryReconnect = false;
        } else {
          reconnectEvent.should.equal(true);
          done();
        }
      });
    });

    it('should emit \'offline\' after going offline', function(done) {
      var client = connect()
        , tryReconnect = true
        , offlineEvent = false;

      client.on('offline', function() {
        offlineEvent = true;
      });

      client.on('connect', function() {
        if (tryReconnect) {
          client.stream.end();
          tryReconnect = false;
        } else {
          offlineEvent.should.equal(true);
          done();
        }
      });
    });

    it('should not reconnect if it was ended by the user', function(done) {
      var client = connect();

      client.on('connect', function() {
        client.end();
        done(); // it will raise an exception if called two times
      });
    });

    it('should setup a reconnect timer on disconnect', function(done) {
      var client = connect();

      client.once('connect', function() {
        should.not.exist(client.reconnectTimer);
        client.stream.end();
      });

      client.once('close', function () {
        should.exist(client.reconnectTimer);
        done();
      });
    });

    it('should allow specification of a reconnect period', function(done) {
      var period = 200
        , client = connect({reconnectPeriod: period})
        , reconnect = false;

      var start = Date.now()
        , end;

      client.on('connect', function () {
        if (!reconnect) {
          client.stream.end();
          reconnect = true;
        } else {
          client.end();
          end = Date.now()
          if (end - start >= period) {
            // Connected in about 2 seconds, that's good enough
            done();
          } else {
            done(new Error('Strange reconnect period'));
          }
        }
      });
    });

    it('should resend in-flight QoS 1 publish messages from the client', function(done) {
      var client = connect({reconnectPeriod: 200})
        , reconnect = false;

      server.once('client', function(client) {
        client.on('connect', function() {
          setImmediate(function() {
            client.stream.destroy();
          });
        });

        server.once('client', function(client) {
          client.on('publish', function() {
            done()
          });
        });
      });

      client.publish('hello', 'world', { qos: 1 });
    });

    it('should resend in-flight QoS 2 publish messages from the client', function(done) {
      var client = connect({reconnectPeriod: 200})
        , reconnect = false;

      server.once('client', function(client) {
        client.on('publish', function() {
          setImmediate(function() {
            client.stream.destroy();
          });
        });

        server.once('client', function(client) {
          client.on('pubrel', function() {
            done()
          });
        });
      });

      client.publish('hello', 'world', { qos: 2 });
    });
  });
};
