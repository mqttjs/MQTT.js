importScripts('/dist/mqtt.js');

/** @type { import('../../src').MqttClient }*/
const MQTT = mqtt;

const client = MQTT.connect(`ws://localhost:4000`, {
    clientId: `testClient-worker_` + Math.random().toString(16).substr(2, 8),
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

client.on('connect', () => {
    console.log('worker client connect');
    client.end(() => {
        console.log('worker client end');
        postMessage('worker ready');
    });
})