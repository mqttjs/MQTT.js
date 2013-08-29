/**
 * Testing dependencies
 */

var mqtt = require('..')
  , abstractClientTests = require("./abstract_client");

/**
 * Testing options
 */
var serverPort = 9876;

/**
 * Test server
 */

var WebSocketServer = require('ws').Server
var websocket = require('websocket-stream')
var http = require("http");

var server = http.createServer();
server.listen(serverPort);

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
  server.emit("client", connection);
})

var createClient = function(port, host, opts) {
  if ('object' === typeof port) {
    opts = port;
    port = serverPort;
    host = 'localhost';
  } else if ('object' === typeof host) {
    opts = host;
    host = 'localhost';
  } else if ('object' !== typeof opts) {
    opts = {};
  }

  if (!host) {
    host = 'localhost'
  }

  if (opts && opts.clean === false && !opts.clientId) {
    throw new Error("Missing clientId for unclean clients");
  }

  var build = function() {
    var url = 'ws://' + host + ':' + port;
    return websocket(url);
  };

  return new mqtt.MqttClient(build, opts);
};

describe('MqttClient', function() {
  abstractClientTests(server, createClient, serverPort);
});
