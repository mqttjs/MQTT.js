'use strict';
/*global setImmediate:true*/
/*eslint no-path-concat:0*/
/**
 * Testing dependencies
 */
var mqtt = require('..'),
  abstractClientTests = require('./abstract_client'),
  fs = require('fs'),
  setImmediate = global.setImmediate || function (callback) {
    // works in node v0.8
    process.nextTick(callback);
  },
  // testing options
  port = 9899,
  // better use path.resolve(__dirname, 'helpers', "tls-key.pem")
  // with this you are system path joining aware
  KEY = __dirname + '/helpers/tls-key.pem',
  CERT = __dirname + '/helpers/tls-cert.pem',
  WRONG_CERT = __dirname + '/helpers/wrong-cert.pem',
  server;

/**
 * Test server
 */
server = new mqtt.SecureServer({
  key: fs.readFileSync(KEY),
  cert: fs.readFileSync(CERT)
}, function (client) {
  client.on('connect', function (packet) {
    if ('invalid' === packet.clientId) {
      client.connack({returnCode: 2});
    } else {
      server.emit('connect', client);
      client.connack({returnCode: 0});
    }
  });

  client.on('publish', function (packet) {
    setImmediate(function () {
      /*jshint -W027*/
      /*eslint default-case:0*/
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
}).listen(port);

describe('MqttSecureClient', function () {
  var config = { protocol: 'mqtts', port: port, rejectUnauthorized: false };
  abstractClientTests(server, config);

  describe('with secure parameters', function () {

    it('should validate successfully the CA', function (done) {
      var client = mqtt.connect({
        protocol: 'mqtts',
        port: port,
        ca: [fs.readFileSync(CERT)],
        rejectUnauthorized: true
      });

      client.on('error', function (err) {
        done(err);
      });

      server.once('connect', function () {
        done();
      });
    });

    it('should validate unsuccessfully the CA', function (done) {
      var client = mqtt.connect({
        protocol: 'mqtts',
        port: port,
        ca: [fs.readFileSync(WRONG_CERT)],
        rejectUnauthorized: true
      });

      client.once('error', function () {
        done();
        client.end();
        client.on('error', function () {});
      });
    });

    it('should emit close on TLS error', function (done) {
      var client = mqtt.connect({
        protocol: 'mqtts',
        port: port,
        ca: [fs.readFileSync(WRONG_CERT)],
        rejectUnauthorized: true
      });

      client.on('error', function () {});

      // TODO node v0.8.x emits multiple close events
      client.once('close', function () {
        done();
      });
    });
  });
});
