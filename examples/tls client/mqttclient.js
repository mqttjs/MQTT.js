/**************************** IMPORTANT NOTE ***********************************

The certificate used on this example has been generated for a host named stark.
So as host we SHOULD use stark if we want the server to be authorized.
For testing this we should add on the computer running this example a line on
the hosts file:
	/etc/hosts [UNIX]
		OR
	\System32\drivers\etc\hosts [Windows]

The line to add on the file should be as follows:
	<the ip address of the server>	stark
*******************************************************************************/

var mqtt = require('mqtt');
var fs = require('fs');
var KEY = __dirname + '/tls-key.pem';
var CERT = __dirname + '/tls-cert.pem';
var TRUSTED_CA_LIST = [__dirname + '/crt.ca.cg.pem'];

var PORT = 1883;
var HOST = 'stark';

var options = {
  keyPath: KEY,
  certPath: CERT,
  rejectUnauthorized : true, 
  //The CA list will be used to determine if server is authorized
  ca: TRUSTED_CA_LIST
};

var client = mqtt.createSecureClient(PORT,HOST,options);

client.subscribe('messages');
client.publish('messages', 'Current time is: ' + new Date());
client.on('message', function(topic, message) {
  console.log(message);
});

client.on('connect', function(){
	console.log('Connected');
});
