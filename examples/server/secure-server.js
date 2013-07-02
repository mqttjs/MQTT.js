
var mqtt = require('../..');
var KEY = __dirname + '/../../test/helpers/tls-key.pem';
var CERT = __dirname + '/../../test/helpers/tls-cert.pem';

var PORT = 8443;

console.log("-- Starting secure server on " + PORT + " --");

var server = mqtt.createSecureServer(KEY, CERT, function (client) { 
  var self = this;

  if (!self.clients) self.clients = {};

  client.on('connect', function(packet) {
    client.connack({returnCode: 0});
    client.id = packet.clientId;
    self.clients[client.id] = client;
    console.log("Client connected", client.id);
  });

  client.on('publish', function(packet) {
    for (var k in self.clients) {
      self.clients[k].publish({topic: packet.topic, payload: packet.payload});
    }
  });

  client.on('subscribe', function(packet) {
    client.suback({
      messageId: packet.messageId,
      granted: packet.subscriptions.map(function (e) {
        return e.qos;
      })
    });
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
    console.log('error!', err);
  });
}).listen(PORT);