'use strict';
/*eslint default-case:0*/
/*eslint guard-for-in:0*/
var port, handleClient,
  websocket = require('websocket-stream'),
  WebSocketServer = require('ws').Server,
  Connection = require('mqtt-connection'),
  http = require('http'),
  ports = require('./ports');

port = ports.port;

handleClient = function (client) {
  var self = this;

  if (!self.clients) {
    self.clients = {};
  }

  client.on('connect', function (packet) {
    if ('invalid' === packet.clientId) {
      client.connack({returnCode: 2});
    } else {
      client.connack({returnCode: 0});
    }
    self.clients[packet.clientId] = client;
    client.subscriptions = [];
  });

  client.on('publish', function (packet) {
    var i, k, c, s, publish;
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

    for (k in self.clients) {
      c = self.clients[k];
      publish = false;

      for (i = 0; i < c.subscriptions.length; i++) {
        s = c.subscriptions[i];

        if (s.test(packet.topic)) {
          publish = true;
        }
      }

      if (publish) {
        try {
          c.publish({topic: packet.topic, payload: packet.payload});
        } catch (error) {
          delete self.clients[k];
        }
      }
    }
  });

  client.on('pubrel', function (packet) {
    client.pubcomp(packet);
  });

  client.on('pubrec', function (packet) {
    client.pubrel(packet);
  });

  client.on('pubcomp', function (/*packet*/) {
    // Nothing to be done
  });

  client.on('subscribe', function (packet) {
    var i, qos, topic, reg,
      granted = [];

    for (i = 0; i < packet.subscriptions.length; i++) {
      qos = packet.subscriptions[i].qos;
      topic = packet.subscriptions[i].topic;
      reg = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+') + '$');

      granted.push(qos);
      client.subscriptions.push(reg);
    }

    client.suback({messageId: packet.messageId, granted: granted});
  });

  client.on('unsubscribe', function (packet) {
    client.unsuback(packet);
  });

  client.on('pingreq', function (/*packet*/) {
    client.pingresp();
  });
};

function start (startPort, done) {
  var server = http.createServer(),
    wss = new WebSocketServer({server: server});

  wss.on('connection', function (ws) {
    var stream, connection;
    if ('mqttv3.1' !== ws.protocol) {
      return ws.end();
    }

    stream = websocket(ws);
    connection = new Connection(stream);
    handleClient.call(server, connection);
  });
  server.listen(startPort, done);
  return server;
}

if (require.main === module) {
  start(port, function (err) {
    if (err) {
      console.error(err);
      return;
    }
    console.log('standalone server started on port', port);
  });

  start(process.env.PORT || process.env.ZUUL_PORT, function (err) {
    if (err) {
      console.error(err);
      return;
    }
    console.log('tunnelled server started on port', process.env.PORT || process.env.ZUUL_PORT);
  });
}
