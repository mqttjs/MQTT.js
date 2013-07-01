
var mqtt = require('../..');

var KEY = __dirname + '/../../test/helpers/private-key.pem';
var CERT = __dirname + '/../../test/helpers/public-cert.pem';

var PORT = 8443;

var options = {
  keyPath: KEY,
  certPath: CERT,
  rejectUnauthorized : false
};

var client = mqtt.createSecureClient(PORT, options);

client.subscribe('messages');
client.publish('messages', 'Current time is: ' + new Date());
client.on('message', function(topic, message) {
  console.log(message);
});
