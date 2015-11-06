'use strict';
/*eslint no-unused-vars:0*/
var server,
  Server = require('../server');

server = new Server(function (client) {
  client.on('connect', function () {
    client.connack({ returnCode: 0 });
  });
}).listen(3000, 'localhost');
