var mqtt = require('../..')
  , client = mqtt.createClient();

client.subscribe('test');
client.on('message', function(topic, message) {
  console.log(message);
});
