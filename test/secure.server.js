
var servers = require('./helpers/server'),
  mqtt = require('..');

var KEY = __dirname + '/helpers/tls-key.pem';//__dirname + '/helpers/private-key.pem';
var CERT = __dirname + '/helpers/tls-cert.pem';//__dirname + '/helpers/public-cert.pem';

var PORT = 1883; //port collides with other tests so +1


this.server = servers.init_secure_server(PORT);
this.server.on('client', function(client) {
	console.log("app server on client");
	console.log(client);
})
console.log("-- Starting secure server on " + PORT + " --");





// var tls = require('tls'),
//     fs = require('fs'),
//     colors = require('colors'),
//     msg = [
//             ".-..-..-.  .-.   .-. .--. .---. .-.   .---. .-.",
//             ": :; :: :  : :.-.: :: ,. :: .; :: :   : .  :: :",
//             ":    :: :  : :: :: :: :: ::   .': :   : :: :: :",
//             ": :: :: :  : `' `' ;: :; :: :.`.: :__ : :; ::_;",
//             ":_;:_;:_;   `.,`.,' `.__.':_;:_;:___.':___.':_;" 
//           ].join("\n").cyan;

// var options = {
//   key: fs.readFileSync(__dirname + '/helpers/tls-key.pem'),
//   cert: fs.readFileSync(__dirname + '/helpers/tls-cert.pem')
// };

// tls.createServer(options, function (s) {
//   s.write(msg+"\n");
//   s.pipe(s);
// }).listen(8000);