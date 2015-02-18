'use strict';
/*eslint no-unused-vars:0*/
var server,
  mqtt = require('../../');

server = new mqtt.Server(function (client) {
  client.on('connect', function () {
    client.connack({ returnCode: 0 });
  });
}).listen(3000, 'localhost');
