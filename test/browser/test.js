import { expect } from '@esm-bundle/chai';
import mqtt from '../../'; // this will resolve to mqtt/dist/mqtt.esm.js

// needed to test no-esm version /dist/mqtt.js
/** @type { import('../../src').MqttClient }*/
const mqtt2 = window.mqtt

// get browser name
const userAgent = navigator.userAgent.toLowerCase().replace(/ /g, '_').replace(/\//g, '_')

let browser = 'unknown'

console.log('userAgent:', userAgent)

if (userAgent.includes('chrome')) {
	browser = 'chrome'
} else if (userAgent.includes('firefox')) {
	browser = 'firefox'
} else if (userAgent.includes('safari')) {
	browser = 'safari'
}

const browserTopic = `test/${browser}`

console.log('browser:', browser)

function run(proto, port, cb) {

	const testTopic = `${browserTopic}/${proto}`

	describe('MQTT.js browser test with ' + proto.toUpperCase(), () => {
		after(() => {
			if(client) {
				client.end(true);
			}

			if (cb) {
				cb()
			}
		})

		/** @type { import('../../src').MqttClient }*/
		let client = null;

		it('should connect-publish-subscribe', (done) => {
			client = mqtt.connect(`${proto}://localhost:${port}`, {
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

			const payload = 'Hello World!'
			client.on('connect', () => {
				client.on('message', (topic, msg) => {
					expect(topic).to.equal(testTopic);
					expect(msg.toString()).to.equal(payload);
					client.end(() => {
						client = null;
						done();
					});
				});

				client.subscribe(testTopic, (err) => {
					expect(err).to.not.exist;
					if (!err) {
						client.publish(testTopic, payload, (err2) => {
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

it('should work with non-ESM version', () => {
	expect(mqtt2).to.exist
	expect(mqtt2.connect).to.exist
	expect(mqtt2.connect).to.be.a('function')
})


run('ws', window.wsPort, () => {
	run('wss', window.wssPort, () => {
		describe('MQTT.js browser test with web worker', () => {
			it('should work with web worker', async () => {
				const worker = new Worker('test/browser/worker.js')
				const ready = new Promise((resolve, reject) => {
					worker.onmessage = (e) => {
						if (e.data === 'worker ready') {
							resolve()
						} else {
							reject(e.data)
						}
					}
				})
				await ready
			})
		})
	})
})

