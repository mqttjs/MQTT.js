
var servers = require('./helpers/server'),
  mqtt = require('..');

var KEY = __dirname + '/helpers/tls-key.pem'; //'/private-key.pem';
var CERT = __dirname + '/helpers/tls-cert.pem';//public-cert.pem';

// var KEY = __dirname + '/helpers/private-key.pem';
// var CERT = __dirname + '/helpers/public-cert.pem';

var PORT = 1883; //port collides with other tests so +1

var options = {
  keyPath: KEY,
  certPath: CERT,
  rejectUnauthorized : false
};

var client = mqtt.createSecureClient(PORT, options, 'crate.getclementine.com');
console.log("client:  connecting...");
//client.conn.connect({keepalive: 1000});
client.on('connack', function (packet) {
  console.log("connacked!");
});
client.on('error', function (err) {
  console.log("error!", err);
});

// var tls = require('tls'),
//     fs = require('fs');

// var options = {
//   //key: fs.readFileSync(__dirname + '/helpers/tls-key.pem'),
//   //cert: fs.readFileSync(__dirname + '/helpers/tls-cert.pem'),
//   rejectUnauthorized : false
// };


// var conn = tls.connect(8000, options, function() {
//   if (conn.authorized) {
//     console.log("Connection authorized by a Certificate Authority.");
//   } else {
//     console.log("Connection not authorized: " + conn.authorizationError)
//   }
//     console.log();
// });



// conn.on("data", function (data) {
//   console.log(data.toString());
//   conn.end();
// });