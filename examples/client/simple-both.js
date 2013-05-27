var mqtt = require('../..')
  , client = mqtt.createClient();

client.subscribe('messages');
client.publish('presence', 'bin hier');
client.on('message', function (topic, message) {
  console.log(message);
});
client.end();
