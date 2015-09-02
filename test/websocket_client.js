'use strict';
/**
 * Testing dependencies
 */
/*global setImmediate:true*/
var http = require('http'),
  websocket = require('websocket-stream'),
  WebSocketServer = require('ws').Server,
  Connection = require('mqtt-connection'),
  abstractClientTests = require('./abstract_client'),
  setImmediate = global.setImmediate || function (callback) {
    // works in node v0.8
    process.nextTick(callback);
  },
  port = 9999,
  server = http.createServer();


function attachWebsocketServer (wsServer) {
  var wss = new WebSocketServer({server: wsServer});

  wss.on('connection', function (ws) {
    var stream = websocket(ws),
      connection = new Connection(stream);

    wsServer.emit('client', connection);
  });

  return wsServer;
}

attachWebsocketServer(server);

server.on('client', function (client) {
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

describe('Websocket Client', function () {
  var config = { protocol: 'ws', port: port };
  abstractClientTests(server, config);
});
