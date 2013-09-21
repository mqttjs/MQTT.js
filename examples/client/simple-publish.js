var mqtt = require('../..')
  , client = mqtt.createClient();

client.publish('presence', 'hello!');
client.end();
