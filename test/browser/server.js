
var websocket = require('websocket-stream');
var WebSocketServer = require('ws').Server;
var mqtt = require("../../");
var Connection = require('mqtt-connection');
var http = require("http");
var ports = require('./ports');

var port = ports.port;

var handleClient = function (client) {
  var self = this;

  if (!self.clients) self.clients = {};

  client.on('connect', function(packet) {
    if (packet.clientId === 'invalid') {
      client.connack({returnCode: 2});
    } else {
      client.connack({returnCode: 0});
    }
    self.clients[packet.clientId] = client;
    client.subscriptions = [];
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

    for (var k in self.clients) {
      var c = self.clients[k]
      , publish = false;

      for (var i = 0; i < c.subscriptions.length; i++) {
        var s = c.subscriptions[i];

        if (s.test(packet.topic)) {
          publish = true;
        }
      }

      if (publish) {
        try {
          c.publish({topic: packet.topic, payload: packet.payload});
        } catch(error) {
          delete self.clients[k];
        }
      }
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
    var granted = [];

    for (var i = 0; i < packet.subscriptions.length; i++) {
        var qos = packet.subscriptions[i].qos
            , topic = packet.subscriptions[i].topic
            , reg = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+') + '$');

        granted.push(qos);
        client.subscriptions.push(reg);
    }

    client.suback({messageId: packet.messageId, granted: granted});
  });

  client.on('unsubscribe', function(packet) {
    client.unsuback(packet);
  });

  client.on('pingreq', function(packet) {
    client.pingresp();
  });
};

function start(port, done) {
  var server = http.createServer();
  var wss = new WebSocketServer({server: server});

  wss.on('connection', function(ws) {
    var stream = websocket(ws);
    var connection = new Connection(stream);
    handleClient(connection);
  });
  server.listen(port, done);
  return server;
}

if (require.main === module) {
  start(port, function(err) {
    if (err) {
      console.error(err);
      return;
    }
    console.log('standalone server started on port', port);
  });

  start(process.env.PORT || process.env.ZUUL_PORT, function(err) {
    if (err) {
      console.error(err);
      return;
    }
    console.log('tunnelled server started on port', port);
  });
}
