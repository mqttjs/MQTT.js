  
/**
 * Testing dependencies
 */
var mqtt = require('..')
  , http = require('http')
  , abstractClientTests = require("./abstract_client");

/**
 * Testing options
 */
var port = 9999;


/**
 * Test server
 */
var server = http.createServer()
mqtt.attachWebsocketServer(server);

server.on('client', function (client) {
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

describe('Websocket Client', function () {
  var config = { protocol: 'ws', port: port };
  abstractClientTests(server, config);
});
