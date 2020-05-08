var MqttServer = require('../../test/server').MqttServer

const fs = require('fs')
const connections = {}
let server

// prevent duplicate exit messages
var SHUTDOWN = false;

// Our socket
const SOCKETFILE = '/tmp/unix.sock';

console.info('Loading interprocess communications test');
console.info(' Socket: %s \n  Process: %s',SOCKETFILE,process.pid);

function createServer(socket){
  console.log('Creating server.');
  let server = new MqttServer(function (c) {
    console.log('Connection acknowledged');

    var self = Date.now();
    connections[self] = (c);
    c.on('end', function() {
      console.log('Client disconnected. ')
      delete connections[self];
    })

    c.on('connect', function (packet) {
      var rc = 'returnCode'
      var connack = {}
      if (serverClient.options && serverClient.options.protocolVersion === 5) {
        rc = 'reasonCode'
        if (packet.clientId === 'invalid') {
          connack[rc] = 128
        } else {
          connack[rc] = 0
        }
      } else {
        if (packet.clientId === 'invalid') {
          connack[rc] = 2
        } else {
          connack[rc] = 0
        }
      }
      if (packet.properties && packet.properties.authenticationMethod) {
        return false
      } else {
        serverClient.connack(connack)
      }
    })
    serverClient.on('publish', function (packet) {
      setImmediate(function () {
        switch (packet.qos) {
        case 0:
          break
        case 1:
          serverClient.puback(packet)
          break
        case 2:
          serverClient.pubrec(packet)
          break
        }
      })
    })

    serverClient.on('subscribe', function (packet) {
      serverClient.suback({
        messageId: packet.messageId,
        granted: packet.subscriptions.map(function (e) {
          return e.qos
        })
      })
    })

    serverClient.on('unsubscribe', function (packet) {
      packet.granted = packet.unsubscriptions.map(function () { return 0 })
      serverClient.unsuback(packet)
    })

    serverClient.on('pingreq', function () {
      serverClient.pingresp()
    })
  });

  server.listen(socket);
  return server;
}

// check for failed cleanup
console.log('Checking for leftover socket.');
fs.stat(SOCKETFILE, function (err, stats) {
    if (err) {
        // start server
        console.log('No leftover socket found.');
        server = createServer(SOCKETFILE); return;
    }
    // remove file then start server
    console.log('Removing leftover socket.')
    fs.unlink(SOCKETFILE, function(err){
        if(err){
            // This should never happen.
            console.error(err); process.exit(0);
        }
        server = createServer(SOCKETFILE); return;
    });
});

// close all connections when the user does CTRL-C
function cleanup(){
    if(!SHUTDOWN){ SHUTDOWN = true;
        console.log('\n',"Terminating.",'\n');
        if(Object.keys(connections).length){
            let clients = Object.keys(connections);
            while(clients.length){
                let client = clients.pop();
                connections[client].write('__disconnect');
                connections[client].end();
            }
        }
        server.close();
        process.exit(0);
    }
}
process.on('SIGINT', cleanup);

