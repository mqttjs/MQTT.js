/**
 * Important note: this application is not suitable for benchmarks!
 */

var http = require('http')
  , url = require('url')
  , fs = require('fs')
  , io = require('socket.io')
  , sys = require(process.binding('natives').util ? 'util' : 'sys')
  , server;

var mqtt = require("../../mqtt");
    
server = http.createServer(function(req, res){
  // your normal server code
  var path = url.parse(req.url).pathname;
  switch (path){
    case '/':
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write('<h1>Welcome. Try the <a href="/chat.html">chat</a> example.</h1>');
      res.end();
      break;
      
    case '/json.js':
    case '/chat.html':
      fs.readFile(__dirname + path, function(err, data){
        if (err) return send404(res);
        res.writeHead(200, {'Content-Type': path == 'json.js' ? 'text/javascript' : 'text/html'})
        res.write(data, 'utf8');
        res.end();
      });
      break;
      
    default: send404(res);
  }
}),

send404 = function(res){
  res.writeHead(404);
  res.write('404');
  res.end();
};

server.listen(8080);

// socket.io, I choose you
// simplest chat application evar
var io = io.listen(server)
  , buffer = [];
  

var sockClients = [];

io.on('connection', function(client){
  client.send({ buffer: buffer });
  client.broadcast({ announcement: client.sessionId + ' connected' });

  sockClients[client.sessionId] = client;
  
  client.on('message', function(message){
    var msg = { message: [client.sessionId, message] };
    buffer.push(msg);
    if (buffer.length > 15) buffer.shift();
    client.broadcast(msg);
    for(var k in mqttClients) {
	var c = mqttClients[k];
	c.publish('socketio', JSON.stringify(msg));
    }
  });

  client.on('disconnect', function(){
    client.broadcast({ announcement: client.sessionId + ' disconnected' });
    delete sockClients[client.sessionId];
  });
});

var mqttServer = new mqtt.MQTTServer();

var mqttClients = [];

mqttServer.server.listen(1883, '::1');

mqttServer.on('new_client', function(client) {
    client.on('connect', function(packet) {
	this.id = packet.clientId;
	mqttClients[this.id] = this;
	client.connack(0);

	for(var k in sockClients) {
	    var c = sockClients[k];
	    c.send( { announcement: 'MQTT client ' + packet.clientId + ' connected!' });
	}
    });

    client.on('subscribe', function(packet) {
	var qos = []
	for(var i = 0; i < packet.subscriptions.length; i++) {
	    qos.push(packet.subscriptions[i].qos);
	}

	client.suback(packet.messageId, qos);
    });

    client.on('publish', function(packet) {
	var topic = packet.topic;
	var message = packet.payload;
	/* Publish to everybody on MQTT */
	for(var k in mqttClients) {
	    var c = mqttClients[k];
	    c.publish(topic, message);
	}

	/* Publish to everybody on WS */
	for(var k in sockClients) {
	    var c = sockClients[k];
	    c.send( { announcement: 'MQTT publish: ' + 'Topic: ' + topic + ' Message: ' + message } );
	}
    });

    client.on('pingreq', function(packet) {
	client.pingresp();
    });

    client.on('disconnect', function() {
	this.socket.end();
	delete mqttClients[this.id];
    });

    client.on('error', function(error) {
	this.socket.end();
	delete mqttClients[this.id];
    });
});
