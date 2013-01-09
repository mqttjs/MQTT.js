var mqtt = require('../..')
  , redis = require('redis');

mqtt.createServer(function(err, client) {
  client.p = redis.createClient(null, null, {no_ready_check: true});
  client.s = redis.createClient(null, null, {no_ready_check: true});

  client.on('connect', function(packet) {
    client.connack({returnCode: 0});
  });

  client.on('subscribe', function(packet) {
    var granted = [];
    for (var i = 0; i < packet.subscriptions.length; i++) {
      var sub = packet.subscriptions[i]
      granted.push(sub.qos);

      client.s.psubscribe(
        sub.topic
          .replace(/\+/g, '[^/]')
          .replace(/\#/g, '*')
      );
    }

    client.suback({messageId: packet.messageId, granted: granted});
  });
  client.on('publish', function(packet) {
    client.p.publish(packet.topic, packet.payload);
  });
  client.on('pingreq', function(packet) {
    client.pingresp();
  });
  client.on('close', function() {
    client.p.end();
    client.s.end();
  });
  client.s.on('pmessage', function(pattern, channel, message) {
    client.publish({topic: channel, payload: message});
  });
  client.on('disconnect', function(packet) {
    client.stream.end();
  });
  client.on('error', function(e) {
    client.stream.end();
    console.log(e);
  });
}).listen(process.argv[2] || 1883);

