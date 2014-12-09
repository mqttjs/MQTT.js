
var websocket = require('websocket-stream')
  , WebSocketServer = require('ws').Server
  , Connection = require('./connection');

function attachWebsocketServer(server, handler) {
  var wss = new WebSocketServer({server: server})

  if (handler)
    server.on('client', handler);

  wss.on('connection', function(ws) {
    var stream = websocket(ws);
    var connection = new Connection(stream);

    stream.on('error', connection.emit.bind(connection, 'error'));
    stream.on('close', connection.emit.bind(connection, 'close'));

    server.emit("client", connection);
  });

  return server;
}

module.exports = attachWebsocketServer;
