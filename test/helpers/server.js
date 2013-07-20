var mqtt = require('../../lib/mqtt');

module.exports.init_server = function (PORT) {
  var server = mqtt.createServer(function (client) {
    /*var i, events = ['connect', 'publish', 'pubrel', 'subscribe', 'disconnect'];

    for (i = 0; i < events.length; i++) {
      client.on(events[i], function (packet) {
        //console.dir(packet);
      });
    }
    */

    client.on('connect', function (packet) {
      client.connack(0);
    });

    client.on('publish', function (packet) {
      switch (packet.qos) {
      case 1:
        client.puback({messageId: packet.messageId});
        break;
      case 2:
        client.pubrec({messageId: packet.messageId});
        break;
      default:
        //console.log('errors? QOS=', packet.qos);
        break;
      }

    });

    client.on('pubrel', function (packet) {
      client.pubcomp({messageId: packet.messageId});
    });

    client.on('pingreq', function (packet) {
      client.pingresp();
    });

    client.on('disconnect', function (packet) {
      client.stream.end();
    });
  });
  server.listen(PORT);
  return server;
};

module.exports.init_secure_server = function (PORT, KEY, CERT) {
  var server = mqtt.createSecureServer(KEY, CERT, function (client) {
    client.on('connect', function (packet) {
      client.connack({returnCode: 0});
    });
  });
  server.listen(PORT);
  return server;
};
