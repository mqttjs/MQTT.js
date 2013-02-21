/**
 * Testing dependencies
 */

var should = require('should')
  , mqtt = require('..')
  , spawn = require('child_process').spawn;

/**
 * Modules to be tested
 */

var MqttClient = require('../lib/client');

/**
 * Testing options
 */

var port = 9876;

describe('MqttClient', function () {
  before(function () {
    this.server = mqtt.createServer();
    this.server.listen(port);
  });

  describe('connecting', function() {

    it('should connect to the broker', function (done) {
      var client = new MqttClient(port);

      this.server.once('client', function(client) {
        done();
      });

    }); 

    it('should send a default client id', function (done) {
      var client = new MqttClient(port);

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.client.should.match(/mqttjs.*/);
          done();
        });
      });

    });

    it('should connect with the given client id', function (done) {
      var client = 
        new MqttClient(port, 'localhost', {client: 'testclient'});

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.client.should.match(/testclient/);
          done();
        });
      });
    });

    it('should default to localhost', function (done) {
      var client = new MqttClient(port, {client: 'testclient'});

      this.server.once('client', function (client) {
        client.once('connect', function(packet) {
          packet.client.should.match(/testclient/);
          done();
        });
      });
    });

    it('should emit connect', function (done) {
      var client = new MqttClient(port);
      client.once('connect', done);
      client.once('error', done);

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
    });

    it('should emit error', function (done) {
      var client = new MqttClient(port);
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
  });

  describe('publishing', function() {
    it('should publish a message', function (done) {
      var client = new MqttClient(port)
        , payload = 'test'
        , topic = 'test';

      client.once('connect', function() {
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
      var client = new MqttClient(port)
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
      var client = new MqttClient(port);
      
      client.once('connect', function() {
        client.publish('a', 'b', function (err, success) {
          done(err);
        });
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
      });
      
    });

    it('should fire a callback (qos 1)', function (done) {
      var client = new MqttClient(port);

      var opts = {qos: 1};

      client.once('connect', function() {
        client.publish('a', 'b', opts, function (err, success) {
          done(err);
        });
      });

      this.server.once('client', function(client) {
        client.once('connect', function(packet) {
          client.connack({returnCode: 0});
        });
        client.once('publish', client.puback.bind(client));
      });
    });

    it('should fire a callback (qos 2)', function (done) {
      var client = new MqttClient(port);

      var opts = {qos: 2};

      client.once('connect', function() {
        client.publish('a', 'b', opts, function (err, success) {
          done(err);
        });
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

  describe('pinging', function () {
    it('should ping every half keep alive time', function (done) {
      var keepalive = 1000;
      this.timeout(keepalive / 2);

      var client = new MqttClient(port, {keepalive: keepalive/2});

      this.server.once('client', function(client) {
        client.once('pingreq', function(packet) {
          client.pingresp();
          done();
        });
      });
    });
  });

  describe('subscribing', function () {
    it('should send a subscribe message', function(done) {
      var client = new MqttClient(port);

      var topic = 'test';

      client.subscribe(topic);

      this.server.once('client', function(client) {
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
      var client = new MqttClient(port);

      var subs = ['test1', 'test2'];

      client.subscribe(subs);

      this.server.once('client', function(client) {
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
  });

  it('should accept an options parameter', function(done) {
    var client = new MqttClient(port);

    var topic = 'test'
      , opts = {qos: 1};

    client.subscribe(topic, opts);

    this.server.once('client', function(client) {
      client.once('subscribe', function(packet) {
        var expected = [{topic: topic, qos: 1}]

        packet.subscriptions.should.eql(expected);
        done();
      });
    });
  });

  after(function () {
    this.server.close();
  });
});
