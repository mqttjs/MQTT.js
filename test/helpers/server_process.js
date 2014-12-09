var mqtt = require('../../');

var server = new mqtt.Server(function (client) {
  client.on('connect', function () {
    client.connack({ returnCode : 0 });
  });
}).listen(3000, 'localhost');

