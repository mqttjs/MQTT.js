  
/**
 * Testing dependencies
 */
var mqtt = require('..')
  , abstractClientTests = require("./abstract_client");

/**
 * Modules to be tested
 */
var createClient = require('../lib/mqtt').createSecureClient;

/**
 * Testing options
 */
var port = 9899;

var KEY = __dirname + '/helpers/tls-key.pem';
var CERT = __dirname + '/helpers/tls-cert.pem';

var WRONG_CERT = __dirname + '/helpers/wrong-cert.pem';

/**
 * Test server
 */
var server = mqtt.createSecureServer(KEY, CERT, function (client) {
  client.on('connect', function(packet) {
    if (packet.clientId === 'invalid') {
      client.connack({returnCode: 2});
    } else {
      server.emit('connect', client);
      client.connack({returnCode: 0});
    }
  });

  client.on('publish', function (packet) {
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
}).listen(port);

describe('MqttSecureClient', function () {
  abstractClientTests(server, createClient, port);

  if (!process.version.match(/^v0.8/)) {
    describe('with secure parameters', function() {

      it('should validate successfully the CA', function (done) {
        var client = createClient(port, {
          ca: [CERT],
          rejectUnauthorized: true
        });

        client.on('error', done)

        server.once('connect', function(client) {
          done();
        });
      });

      it('should validate unsuccessfully the CA', function (done) {
        var client = createClient(port, {
          ca: [WRONG_CERT],
          rejectUnauthorized: true
        });

        server.once('connect', function(client) {
          done(new Error('it should not happen'));
        });

        client.once('error', function() {
          done()
        })
      });

      it('should emit close on TLS error', function (done) {
        var client = createClient(port, {
          ca: [WRONG_CERT],
          rejectUnauthorized: true
        });

        client.on('error', function() {})

        // TODO node v0.8.x emits multiple close events
        client.once('close', function() {
          done()
        })
      });
    })
  }
});
