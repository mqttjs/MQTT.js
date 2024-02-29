importScripts('/dist/mqtt.js');

/** @type { import('../../src') }*/
const MQTT = mqtt;

console.log('worker start');
console.log('worker MQTT', MQTT);

const client = MQTT.connect(`ws://localhost:4000`, {
    clientId: `testClient-worker_` + Math.random().toString(16).substr(2, 8),
    keepalive: 2,
});

client.on('offline', () => {
    console.log('worker client offline');
})

client.on('reconnect', () => {
    console.log('worker client reconnect');
})

client.on('error', (err) => {
    console.log('worker client error', err);
})

client.on('packetsend', (packet) => {
    if (packet.cmd === 'pingreq') {
        postMessage('keepalive');
        client.end(() => {
            console.log('worker client end');

        });
    }
})

client.on('connect', () => {
    console.log('worker client connect');
    postMessage('worker ready');

})