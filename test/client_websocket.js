/**
 * Testing dependencies
 */

var mqtt = require('..')
  , abstractClientTests = require("./abstract_client");

/**
 * Testing options
 */
var port = 9876;

/**
 * Test server
 */

var WebSocketServer = require('ws').Server
var websocket = require('websocket-stream')
var http = require("http");

var server = http.createServer();
server.listen(port);

var clientHandler = function (client) {

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
};


var wss = new WebSocketServer({server: server})
wss.on('connection', function(ws) {
  var connection = websocket(ws).pipe(new mqtt.MqttConnection());
  clientHandler(connection);
})

var createClient = function(port) {
  var build = function() {
    return websocket('ws://localhost:' + port)
  };

  return new mqtt.MqttClient(build);
};

describe('MqttClient', function() {
  abstractClientTests(server, createClient, port);
});
