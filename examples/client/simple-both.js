var mqtt = require('../..')
  , host = '192.168.1.100' // or localhost
  , client = mqtt.connect();
  // or , client = mqtt.connect({ port: 1883, host: host, keepalive: 10000});

client.subscribe('presence');
client.publish('presence', 'bin hier');
client.on('message', function (topic, message) {
  console.log(message);
});
client.end();
