/**
 * Testing dependencies
 */

var mqtt = require('..')
  , should = require('should')
  , abstractClientTests = require("./abstract_client")
  , setImmediate = global.setImmediate || function(callback) {
      // works in node v0.8
      process.nextTick(callback);
    };

/**
 * Testing options
 */
var port = 9876;

/**
 * Test server
 */
function buildServer() {
  return new mqtt.Server(function (client) {

    client.on('connect', function(packet) {
      if (packet.clientId === 'invalid') {
        client.connack({returnCode: 2});
      } else {
        client.connack({returnCode: 0});
      }
    });

    client.on('publish', function(packet) {
      setImmediate(function () {
        switch (packet.qos) {
          case 0:
            break;
          case 1:
            client.puback(packet);
            break;
          case 2:
            client.pubrec(packet);
            break;
        }
      });
    });

    client.on('pubrel', function(packet) {
      client.pubcomp(packet);
    });

    client.on('pubrec', function(packet) {
      client.pubrel(packet);
    });

    client.on('pubcomp', function(packet) {
      // Nothing to be done
    });

    client.on('subscribe', function(packet) {
      client.suback({
        messageId: packet.messageId,
        granted: packet.subscriptions.map(function (e) {
          return e.qos;
        })
      });
    });

    client.on('unsubscribe', function(packet) {
      client.unsuback(packet);
    });

    client.on('pingreq', function(packet) {
      client.pingresp();
    });
  });
};

var server = buildServer().listen(port);


describe('MqttClient', function() {
  describe('creating', function() {
    it('should allow instantiation of MqttClient without the \'new\' operator' , function(done) {
      should(function() {
        var client;

        try {
          client = mqtt.MqttClient(function() {
            throw Error('break');
          }, {});
        } catch (err) {
          if (err.message !== 'break') {
            throw err;
          }
          done();
        }
      }).not.throw("Object #<Object> has no method '_setupStream'");
    });
  });

  var config = { protocol: 'mqtt', port: port };
  abstractClientTests(server, config);

  describe('message ids', function() {
    it('should increment the message id', function() {
      var client = mqtt.connect(config);
      var currentId = client._nextId();

      client._nextId().should.equal(currentId + 1);
    }),

    it('should return 1 once the interal counter reached limit', function() {
      var client = mqtt.connect(config);
      client.nextId = 65535;

      client._nextId().should.equal(65535);
      client._nextId().should.equal(1);
    })
  });

  describe('reconnecting', function () {
    it('should attempt to reconnect once server is down', function (done) {
      this.timeout(15000);

      var fork   = require('child_process').fork;
      var server = fork(__dirname + '/helpers/server_process.js');

      var client = mqtt.connect({ port: 3000, host: 'localhost', keepalive: 1 });

      client.once('connect', function () {
        server.kill('SIGINT'); // mocks server shutdown

        client.once('close', function () {
          should.exist(client.reconnectTimer);
          done();
        });
      });
    });

    it('should reconnect to multiple host-ports combination if servers is passed', function (done) {
      this.timeout(15000);

      var fork   = require('child_process').fork;
      var server2 = buildServer().listen(port + 42);

      server2.on('client', function(c) {
        c.stream.destroy();
        server2.close();
      });

      server2.on('listening', function() {

        var client = mqtt.connect({ servers: [
          { port: port + 42, host: 'localhost' },
          { port: port, host: 'localhost' },
        ], keepalive: 50 });

        server.once('client', function(client) {
          client.disconnect();
          done();
        });

        client.once('connect', function () {
          client.stream.destroy();
        });
      });
    });
  });
});
