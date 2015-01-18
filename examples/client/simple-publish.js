var mqtt = require('../..')
  , client = mqtt.connect();

client.publish('presence', 'hello!');
client.end();
