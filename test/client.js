'use strict';
/*global setImmediate:true*/
/*eslint no-path-concat:0*/
/*eslint default-case:0*/
/**
 * Testing dependencies
 */

var mqtt = require('..'),
  should = require('should'),
  abstractClientTests = require('./abstract_client'),
  setImmediate = global.setImmediate || function (callback) {
    // works in node v0.8
    process.nextTick(callback);
  },
  net = require('net'),
  eos = require('end-of-stream'),
  port = 9876,
  server;

/**
 * Test server
 */
function buildServer () {
  return new mqtt.Server(function (client) {

    client.on('connect', function (packet) {
      if ('invalid' === packet.clientId) {
        client.connack({returnCode: 2});
      } else {
        client.connack({returnCode: 0});
      }
    });

    client.on('publish', function (packet) {
      setImmediate(function () {
        /*jshint -W027*/
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
        /*jshint +W027*/
      });
    });

    client.on('pubrel', function (packet) {
      client.pubcomp(packet);
    });

    client.on('pubrec', function (packet) {
      client.pubrel(packet);
    });

    client.on('pubcomp', function () {
      // Nothing to be done
    });

    client.on('subscribe', function (packet) {
      client.suback({
        messageId: packet.messageId,
        granted: packet.subscriptions.map(function (e) {
          return e.qos;
        })
      });
    });

    client.on('unsubscribe', function (packet) {
      client.unsuback(packet);
    });

    client.on('pingreq', function () {
      client.pingresp();
    });
  });
}

server = buildServer().listen(port);


describe('MqttClient', function () {
  describe('creating', function () {
    it('should allow instantiation of MqttClient without the \'new\' operator', function (done) {
      should(function () {
        var client;
        try {
          client = mqtt.MqttClient(function () {
            throw Error('break');
          }, {});
          client.end();
        } catch (err) {
          if ('break' !== err.message) {
            throw err;
          }
          done();
        }
      }).not.throw('Object #<Object> has no method \'_setupStream\'');
    });
  });

  var config = { protocol: 'mqtt', port: port };
  abstractClientTests(server, config);

  describe('message ids', function () {
    it('should increment the message id', function () {
      var client = mqtt.connect(config),
        currentId = client._nextId();

      client._nextId().should.equal(currentId + 1);
    });

    it('should return 1 once the interal counter reached limit', function () {
      var client = mqtt.connect(config);
      client.nextId = 65535;

      client._nextId().should.equal(65535);
      client._nextId().should.equal(1);
    });
  });

  describe('reconnecting', function () {
    it('should attempt to reconnect once server is down', function (done) {
      this.timeout(15000);

      var fork = require('child_process').fork,
        // better use path.resolve(__dirname, 'helpers', "server_process.js")
        // with this you are system path joining aware
        innerServer = fork(__dirname + '/helpers/server_process.js'),
        client = mqtt.connect({ port: 3000, host: 'localhost', keepalive: 1 });

      client.once('connect', function () {
        innerServer.kill('SIGINT'); // mocks server shutdown

        client.once('close', function () {
          should.exist(client.reconnectTimer);
          done();
        });
      });
    });

    it('should reconnect to multiple host-ports combination if servers is passed', function (done) {
      this.timeout(15000);

      var server2 = buildServer().listen(port + 42);

      server2.on('client', function (c) {
        c.stream.destroy();
        server2.close();
      });

      server2.on('listening', function () {

        var client = mqtt.connect({ servers: [
          { port: port + 42, host: 'localhost' },
          { port: port, host: 'localhost' }
        ], keepalive: 50 });

        server.once('client', function (serverClient) {
          serverClient.disconnect();
          done();
        });

        client.once('connect', function () {
          client.stream.destroy();
        });
      });
    });

    it('should reconnect if a connack is not received in an interval', function (done) {
      this.timeout(2000);

      var server2 = net.createServer().listen(port + 43);

      server2.on('connection', function (c) {
        eos(c, function () {
          server2.close();
        });
      });

      server2.on('listening', function () {

        var client = mqtt.connect({ servers: [
          { port: port + 43, host: 'localhost' },
          { port: port, host: 'localhost' }
        ], connectTimeout: 500 });

        server.once('client', function (serverClient) {
          serverClient.disconnect();
          done();
        });

        client.once('connect', function () {
          client.stream.destroy();
        });
      });
    });

    it('shoud not be cleared by the connack timer', function (done) {
      this.timeout(4000);

      var server2 = net.createServer().listen(port + 44);

      server2.on('connection', function (c) {
        c.destroy();
      });

      server2.once('listening', function () {
        var reconnects = 0,
          connectTimeout = 1000,
          reconnectPeriod = 100,
          expectedReconnects = Math.floor(connectTimeout / reconnectPeriod),
          client = mqtt.connect({
            port: port + 44,
            host: 'localhost',
            connectTimeout: connectTimeout,
            reconnectPeriod: reconnectPeriod });

        client.on('reconnect', function () {
          reconnects++;
          if (reconnects >= expectedReconnects) {
            client.end();
            done();
          }
        });
      });
    });
    it('shoud not keep requeueing the first message when offline', function (done) {
      this.timeout(2500);

      var server2 = buildServer().listen(port + 45),
        client = mqtt.connect({
          port: port + 45,
          host: 'localhost',
          connectTimeout: 350,
          reconnectPeriod: 300
        });

      server2.on('client', function (c) {
        client.publish('hello', 'world', { qos: 1 }, function () {
          c.destroy();
          server2.close();
          client.publish('hello', 'world', { qos: 1 });
        });
      });

      setTimeout(function () {
        if (0 === client.queue.length) {
          client.end(true);
          done();
        } else {
          client.end(true);
        }
      }, 2000);
    });
  });
});
