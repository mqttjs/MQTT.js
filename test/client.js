/**
 * Testing dependencies
 */

var should = require('should')
  , mqtt = require('..');

/**
 * Modules to be tested
 */
var createClient = require('../lib/mqtt').createClient;

/**
 * Testing options
 */

var port = 9876;

describe('MqttClient', function () {
  before(function () {
    this.server = mqtt.createServer();
    this.server.listen(port);
  });

  describe('errors', function() {
    it('should emit an error if unable to connect', 
        function(done) {
      var client = createClient(9767);

      client.once('error', function(error) {
        if (/ECONNREFUSED/.test(error.message)) {
          done()
        } else {
          done(error);
        }
      });
    });
  });

  describe('closing', function() {
    it('should emit close if stream closes', function(done) {
      var client = createClient(port);

      client.stream.end();
      client.on('close', function() {
        done();
      });
    });

    it('should mark the client as disconnected', function(done) {
      var client = createClient(port);

      client.stream.on('close', function() {
        if (!client.connected) {
          done();
        } else {
          done(new Error('Not marked as disconnected'));
        }
      });
      client.on('connect', function() {
        client.stream.end();
      });
      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });

    it('should stop ping timer if stream closes', function(done) {
      var client = createClient(port);
      
      client.on('close', function() {
        should.not.exist(client.pingTimer);
        done();
      });

      client.once('connect', function() {
        should.exist(client.pingTimer);
        client.stream.end();
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });

    it('should emit close after end called', function(done) {
      var client = createClient(port);

      client.on('close', function() {
        done();
      });

      client.on('connect', function() {
        client.end();
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });

    it('should stop ping timer after end called', function(done) {
      var client = createClient(port);
      
      client.once('connect', function() {
        should.exist(client.pingTimer);
        client.end();
        should.not.exist(client.pingTimer);
        done();
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });
  });

  describe('connecting', function() {
    it('should connect to the broker', function (done) {
      var client = createClient(port);

      this.server.once('client', function(client) {
        done();
      });
    }); 

    it('should send a default client id', function (done) {
      var client = createClient(port);

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clientId.should.match(/mqttjs.*/);
          done();
        });
      });
    });

    it('should connect with the given client id', function (done) {
      var client = createClient(port, 'localhost',
        {clientId: 'testclient'});

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clientId.should.match(/testclient/);
          done();
        });
      });
    });

    it('should default to localhost', function (done) {
      var client = createClient(port, {clientId: 'testclient'});

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.clientId.should.match(/testclient/);
          done();
        });
      });
    });

    it('should emit connect', function (done) {
      var client = createClient(port);
      client.once('connect', done);
      client.once('error', done);

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });

    it('should mark the client as connected', function(done) {
      var client = createClient(port);
      client.once('connect', function() {
        if (client.connected) {
          done();
        } else {
          done(new Error('Not marked as connected'));
        }
      });
      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });

    it('should emit error', function (done) {
      var client = createClient(port);
      client.once('connect', function () {
        done(new Error('Should not emit connect'));
      });
      client.once('error', function(error) {
        done();
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 2});
        });
      });
    });

    it('should have different client ids', function() {
      var client1 = createClient(port).options.clientId
        , client2 = createClient(port).options.clientId;

      client1.should.not.equal(client2);
    });
  });

  describe('offline messages', function() {
    it('should queue message until connected', function(done) {
      var client = createClient(port);

      client.publish('test', 'test');
      client.subscribe('test');
      client.unsubscribe('test');
      client.queue.length.should.equal(3);

      client.once('connect', function() {
        client.queue.length.should.equal(0);
        done();
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });
  });

  describe('publishing', function() {
    it('should publish a message (offline)', function (done) {
      var client = createClient(port)
        , payload = 'test'
        , topic = 'test';

      client.publish(topic, payload);

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });

        client.once('publish', function (packet) {
          packet.topic.should.equal(topic);
          packet.payload.should.equal(payload);
          packet.qos.should.equal(0);
          packet.retain.should.equal(false);
          done();
        });
      });
    });

    it('should publish a message (online)', function (done) {
      var client = createClient(port)
        , payload = 'test'
        , topic = 'test';

      client.on('connect', function() {
        client.publish(topic, payload);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });

        client.once('publish', function (packet) {
          packet.topic.should.equal(topic);
          packet.payload.should.equal(payload);
          packet.qos.should.equal(0);
          packet.retain.should.equal(false);
          done();
        });
      });
    });

    it('should accept options', function (done) {
      var client = createClient(port)
        , payload = 'test'
        , topic = 'test';
      
      var opts = {
        retain: true,
        qos: 1
      }

      client.once('connect', function() {
        client.publish(topic, payload, opts);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });

        client.once('publish', function (packet) {
          packet.topic.should.equal(topic);
          packet.payload.should.equal(payload);
          packet.qos.should.equal(opts.qos, 'incorrect qos');
          packet.retain.should.equal(opts.retain, 'incorrect ret');
          done();
        });
      });
    });

    it('should fire a callback (qos 0)', function (done) {
      var client = createClient(port);
      
      client.once('connect', function() {
        client.publish('a', 'b', done);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });

    it('should fire a callback (qos 1)', function (done) {
      var client = createClient(port);

      var opts = {qos: 1};

      client.once('connect', function() {
        client.publish('a', 'b', opts, done);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
        client.on('publish', function(packet) {
          client.puback({messageId: packet.messageId});
        });
      });
    });

    it('should fire a callback (qos 2)', function (done) {
      var client = createClient(port);

      var opts = {qos: 2};

      client.once('connect', function() {
        client.publish('a', 'b', opts, done);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
        client.once('publish', client.pubrec.bind(client));
        client.once('pubrel', client.pubcomp.bind(client));
      });
    });
  });

  describe('unsubscribing', function() {
    it('should send an unsubscribe packet (offline)', function(done) {
      var client = createClient(port);

      client.unsubscribe('test');

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });

        client.once('unsubscribe', function(packet) {
          packet.unsubscriptions.should.include('test');
          done();
        });
      });
    });
    it('should send an unsubscribe packet', function(done) {
      var client = createClient(port);
      var topic = 'topic';

      client.once('connect', function() {
        client.unsubscribe(topic);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });

        client.once('unsubscribe', function(packet) {
          packet.unsubscriptions.should.include(topic);
          done();
        });
      });
    });

    it('should accept an array of unsubs', function(done) {
      var client = createClient(port);

      var topics = ['topic1', 'topic2'];

      client.once('connect', function() {
        client.unsubscribe(topics);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });

        client.once('unsubscribe', function(packet) {
          packet.unsubscriptions.should.eql(topics);
          done();
        });
      });
    });

    it('should fire a callback on unsuback', function(done) {
      var client = createClient(port);

      var topic = 'topic';

      client.once('connect', function() {
        client.unsubscribe(topic, done);
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
        client.once('unsubscribe', function(packet) {
          client.unsuback(packet);
        });
      });
    });
  });

  describe('pinging', function () {
    it('should ping before <keepalive> sec', function (done) {
      var keepalive = 3;
      this.timeout(keepalive * 1000);

      var client = createClient(port, {keepalive: keepalive});

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
        client.once('pingreq', function(packet) {
          client.pingresp();
          done();
        });
      });
    });
    it('should not set a ping timer keepalive=0', function() {
      var client = createClient(port, {keepalive:0});
      should.not.exist(client.pingTimer);
    });
  });

  describe('subscribing', function () {
    it('should send a subscribe message (offline)', function(done) {
      var client = createClient(port);

      client.subscribe('test');

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });

        client.once('subscribe', function(packet) {
          done();
        });
      });
    });
    it('should send a subscribe message', function(done) {
      var client = createClient(port);

      var topic = 'test';

      client.once('connect', function() {
        client.subscribe(topic);
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });
        client.once('subscribe', function(packet) {
          packet.subscriptions.should.includeEql({
            topic: topic,
            qos: 0
          });
          done();
        });
      });
    });

    it('should accept an array of subscriptions', function(done) {
      var client = createClient(port);

      var subs = ['test1', 'test2'];

      client.once('connect', function(args) {
        client.subscribe(subs);
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });
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

    it('should accept an options parameter', function(done) {
      var client = createClient(port);

      var topic = 'test'
        , opts = {qos: 1};

      client.once('connect', function(args) {
        client.subscribe(topic, opts);
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });

        client.once('subscribe', function(packet) {
          var expected = [{topic: topic, qos: 1}]

          packet.subscriptions.should.eql(expected);
          done();
        });
      });
    });

    it('should fire a callback on suback', function(done) {
      var client = createClient(port);

      var topic = 'test';

      client.once('connect', function(args) {
        client.subscribe(topic, {qos:2}, function (err, granted) {
          if (err) {
            done(err);
          } else {
            should.exist(granted, 'granted not given');
            granted.should.includeEql({topic: 'test', qos: 2});
            done();
          }
        });
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });

        client.once('subscribe', function (packet) {
          client.suback({
            messageId: packet.messageId,
            granted: packet.subscriptions.map(function (e) {
              return e.qos;
            })
          });
        });
      });
    });
  });

  describe('receiving messages', function() {
    it('should fire the message event ', function(done) {
      var client = createClient(port)
        , test_packet = {
          topic: 'test',
          payload: 'message',
          retain: true,
          qos: 1,
          messageId: 5
        }

      client.subscribe(test_packet.topic);
      client.on('message', 
          function(topic, message, packet) {
        topic.should.equal(test_packet.topic);
        message.should.equal(test_packet.payload);
        packet.should.equal(packet);
        done();
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });

        client.once('subscribe', function (packet) {
          client.publish(test_packet);
        });
      });
    });
    it('should emit a message event (qos=2)', function(done) {
      var client = createClient(port)
        , test_packet = {
          topic: 'test',
          payload: 'message',
          retain: true,
          qos: 2,
          messageId: 5
        }

      client.subscribe(test_packet.topic);
      client.on('message', 
          function(topic, message, packet) {
        topic.should.equal(test_packet.topic);
        message.should.equal(test_packet.payload);
        packet.should.equal(packet);
        done();
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });

        client.once('subscribe', function (packet) {
          client.publish(test_packet);
        });
        client.once('pubrec', function(packet) {
          client.pubrel(packet);
        });
      });
    });
  });
  describe('qos handling', function() {

    it('should follow qos 0 semantics (trivial)', function(done) {
      var client = createClient(port)
        , test_topic = 'test'
        , test_message = 'message';

      client.once('connect', function() {
        client.subscribe(test_topic, {qos: 0});
      });

      this.server.once('client', function(client) {
        client.once('connect', function (packet) {
          client.connack({returnCode: 0});
        });
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
      var client = createClient(port)
        , test_topic = 'test'
        , test_message = 'message'
        , mid = 50;

      client.once('connect', function(args) {
        client.subscribe(test_topic, {qos: 1});
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });
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
      var client = createClient(port)
        , test_topic = 'test'
        , test_message = 'message'
        , mid = 253;

      client.once('connect', function() {
        client.subscribe(test_topic, {qos: 2});
      });

      this.server.once('client', function(client) {
        client.once('connect', function() {
          client.connack({returnCode: 0});
        });
        client.once('subscribe', function (packet) {
          client.publish({
            topic: test_topic,
            payload: test_message,
            qos: 2,
            messageId: mid
          });
        });

        client.once('pubrec', function (packet) {
          packet.messageId.should.equal(mid);
          client.pubrel({messageId: packet.messageId});
        });
        client.once('pubcomp', function(packet) {
          packet.messageId.should.equal(mid);
          done();
        });
      });
    });
  });

  after(function () {
    this.server.close();
  });
});
