var mqtt = require('../..')
  , client = mqtt.createClient();

client.publish('messages', 'hello!');
client.end();
