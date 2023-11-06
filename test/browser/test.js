import { expect } from '../../node_modules/@esm-bundle/chai/esm/chai.js';

/** @type { import('../../src/mqtt').MqttClient }*/
const mqtt = window.mqtt

describe('MQTT.js browser test', () => {
	const client = mqtt.connect('ws://localhost:4000', {
		// log: console.log.bind(console),
	})
	client.on('offline', () => {
		console.log('client offline')
	})
	client.on('connect', () => {
		console.log('client connect')
	})
	client.on('reconnect', () => {
		console.log('client reconnect')
	})

	it('should connect to the server', (done) => {
		client.on('connect', () => {
			client.on('message', (topic, msg) => {
				expect(topic).to.equal('hello');
				expect(msg.toString()).to.equal('Hello World!');
				client.end(() => {
					done();
				});
			});

			client.subscribe('hello', (err) => {
				expect(err).to.not.exists;
				if (!err) {
					client.publish('hello', 'Hello World!', (err2) => {
						expect(err2).to.not.exists;
					});
				}
			});
		});

		client.on('error', (err) => {
			done(err);
		});
	})
})
