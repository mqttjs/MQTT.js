importScripts('/dist/mqtt.js');

/** @type { import('../../src').MqttClient }*/
const MQTT = mqtt;

const client = MQTT.connect(`ws://localhost:4000`);

client.on('connect', () => {
    console.log('worker client connect');
    client.end(() => {
        console.log('worker client end');
        postMessage('worker ready');
    });    
})