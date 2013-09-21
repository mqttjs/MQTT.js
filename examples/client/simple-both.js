var mqtt = require('../..')
  , host = '192.168.1.100' // or localhost
  , client = mqtt.createClient();
  // or , client = mqtt.createClient(1883, host, {keepalive: 10000});

client.subscribe('presence');
client.publish('presence', 'bin hier');
client.on('message', function (topic, message) {
  console.log(message);
});
client.end();
