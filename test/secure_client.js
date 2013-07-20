  
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

/**
 * Test server
 */
var server = mqtt.createSecureServer(KEY, CERT, function (client) {
  client.on('connect', function(packet) {
    if (packet.clientId === 'invalid') {
      client.connack({returnCode: 2});
    } else {
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
});
