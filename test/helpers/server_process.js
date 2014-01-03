var server = require('../../lib/mqtt').createServer(function (client) {
  client.on('connect', function () {
    client.connack({ returnCode : 0 });
  });
}).listen(3000, 'localhost');

