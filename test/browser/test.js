import chai from '../../node_modules/@esm-bundle/chai/esm/chai.js';

/** @type { import('../../src/mqtt').MqttClient }*/
const mqtt = window.mqtt

/** @type { import('@esm-bundle/chai').expect } */
const expect = chai.expect;

function run(proto, port) {
	describe('MQTT.js browser test with ' + proto.toUpperCase(), () => {
		const client = mqtt.connect(`${proto}://localhost:${port}`, {
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
	
		it('should connect-publish-subscribe', (done) => {
			client.on('connect', () => {
				client.on('message', (topic, msg) => {
					expect(topic).to.equal('hello');
					expect(msg.toString()).to.equal('Hello World!');
					client.end(() => {
						done();
					});
				});
	
				client.subscribe('hello', (err) => {
					expect(err).to.not.exist;
					if (!err) {
						client.publish('hello', 'Hello World!', (err2) => {
							expect(err2).to.not.exist;
						});
					}
				});
			});
	
			client.on('error', (err) => {
				done(err);
			});
		})
	})
}


run('ws', window.wsPort)
run('wss', window.wssPort)