var mqtt = require('../..')

const fs = require('fs')
const connections = {}
let client

// prevent duplicate exit messages
var SHUTDOWN = false;

// Our socket
const SOCKETFILE = '/tmp/unix.sock';

console.info('Loading interprocess communications test');
console.info('Socket: %s \n  Process: %s',SOCKETFILE,process.pid);

// Connect to server.
console.log("Connecting to server.");
let opts = { protocol: 'file' }
client = mqtt.connect(SOCKETFILE, opts)

client.subscribe('presence')
client.publish('presence', 'Hello mqtt')

client.on('message', function (topic, message) {
  console.log(message.toString())
})

client.end()


function cleanup(){
    if(!SHUTDOWN){ SHUTDOWN = true;
        console.log('\n',"Terminating.",'\n');
        client.end();
        process.exit(0);
    }
}
process.on('SIGINT', cleanup);
