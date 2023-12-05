// test mqttjs in worker

importScripts('/dist/mqtt.js');

/** @type { import('../../src').MqttClient }*/
const MQTT = mqtt;

postMessage(typeof MQTT?.connect === 'function' ? 'worker ready' : 'worker error');