var mqtt = require('../..')
  , client = mqtt.createClient();

client.subscribe('presence');
client.on('message', function(topic, message) {
  console.log(message);
});
