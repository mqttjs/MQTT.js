var mqtt = require('../..');

mqtt.createClient(1883, 'localhost', function(err, client) {
  if (err) {
    console.dir(err);
    return process.exit(-1);
  }

  var events = ['connack', 'puback', 'pubrec', 'pubcomp'];

  for (var i = 0; i < events.length; i++) {
    client.on(events[i], function(packet) {
      console.dir(packet);
    });
  };

  client.connect({keepalive: 1000});

  client.on('connack', function(packet) {
    setInterval(function() {
      client.publish({
        topic: 'test0'
      , payload: 'test'
      , qos: 0
      });

      client.publish({
        topic: 'test1'
      , payload: 'test'
      , qos: 1
      , messageId: 1
      });
      client.publish({
        topic: 'test2'
      , payload: 'test'
      , qos: 2
      , messageId: 2
      });
    }, 10000);

    setInterval(function() {
      client.pingreq();
    }, 1000);
  });

  client.on('pubrec', function(packet) {
    client.pubrel({messageId: 2});
  });
});
