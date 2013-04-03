/* broadcast.js - all published messages are relayed to all connected clients */

var mqtt = require('../..');

mqtt.createSecureServer("private-key.pem", "public-cert.pem", function(client) {
  var self = this;

  if (!self.clients) self.clients = {};

  client.on('connect', function(packet) {
    client.connack({returnCode: 0});
    client.id = packet.clientId;
    console.log("CONNECT: client id: " + client.id);
    self.clients[client.id] = client;
  });

  client.on('publish', function(packet) {
    for (var k in self.clients) {
      self.clients[k].publish({topic: packet.topic, payload: packet.payload});
    }
  });

  client.on('subscribe', function(packet) {
    var granted = [];
    for (var i = 0; i < packet.subscriptions.length; i++) {
      granted.push(packet.subscriptions[i].qos);
    }

    client.suback({granted: granted});
  });

  client.on('pingreq', function(packet) {
    client.pingresp();
  });

  client.on('disconnect', function(packet) {
    client.stream.end();
  });

  client.on('close', function(err) {
    delete self.clients[client.id];
  });

  client.on('error', function(err) {
    client.stream.end();
    util.log('error!');
  });
}).listen(process.argv[2] || 1883);
