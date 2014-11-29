/* broadcast.js - all published messages are relayed to all connected clients */

var mqtt = require('../..')
  , util = require('util');

new mqtt.Server(function(client) {
  var self = this;

  if (!self.clients) self.clients = {};

  client.on('connect', function(packet) {
    client.connack({returnCode: 0});
    client.id = packet.clientId;
    console.log("CONNECT(%s): %j", client.id, packet);
    self.clients[client.id] = client;
  });

  client.on('publish', function(packet) {
    console.log("PUBLISH(%s): %j", client.id, packet);
    for (var k in self.clients) {
      self.clients[k].publish({topic: packet.topic, payload: packet.payload});
    }
  });

  client.on('subscribe', function(packet) {
    console.log("SUBSCRIBE(%s): %j", client.id, packet);
    var granted = [];
    for (var i = 0; i < packet.subscriptions.length; i++) {
      granted.push(packet.subscriptions[i].qos);
    }

    client.suback({granted: granted, messageId: packet.messageId});
  });

  client.on('pingreq', function(packet) {
    console.log('PINGREQ(%s)', client.id);
    client.pingresp();
  });

  client.on('disconnect', function(packet) {
    client.stream.end();
  });

  client.on('close', function(err) {
    delete self.clients[client.id];
  });

  client.on('error', function(err) {
    console.log('error!', err);

    if (!self.clients[client.id]) return;

    client.stream.end();
    console.dir(err);
  });
}).listen(process.argv[2] || 1883);
