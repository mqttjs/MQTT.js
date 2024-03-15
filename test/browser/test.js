import { expect } from '@esm-bundle/chai';
import mqtt, { MqttClient } from '../../'; // this will resolve to mqtt/dist/mqtt.esm.js

// needed to test no-esm version /dist/mqtt.js
/** @type { import('../../src') }*/
const mqtt2 = window.mqtt

// get browser name
const userAgent = navigator.userAgent.toLowerCase().replace(/ /g, '_').replace(/\//g, '_')

let browser = 'unknown'

if (userAgent.includes('chrome')) {
	browser = 'chrome'
} else if (userAgent.includes('firefox')) {
	browser = 'firefox'
} else if (userAgent.includes('safari')) {
	browser = 'safari'
}

const browserTopic = `test/${browser}`
console.log('User Agent:', userAgent)
console.log('Browser:', browser)

function testProto(proto, port, cb = () => { }) {
	const testTopic = `${browserTopic}/${proto}`

	describe('MQTT.js browser test with ' + proto.toUpperCase(), () => {
		after(() => {
			if (client) {
				client.end(() => {
					cb()
					client = null;
				});
			} else {
				cb()
			}
		})

		/** @type { import('../../src').MqttClient }*/
		let client = null;

		it('should connect-publish-subscribe', (done) => {
			
			expect(typeof MqttClient.VERSION).to.equal('string')
			
			client = mqtt.connect(`${proto}://localhost:${port}`, {
				// log: console.log.bind(console),
				clientId: `testClient-${browser}-${proto}`,
			})
			client.on('offline', () => {
				console.log('client offline')
				done(new Error('client offline'))
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

describe('MQTT.js browser tests', () => {
	it('should work with ESM version', (done) => {
		expect(mqtt2).to.exist
		expect(mqtt2.connect).to.be.a('function')
		expect(mqtt2.Client).to.be.a('function')
		done()
	})

	it('should work in a Web Worker', (done) => {
		const worker = new Worker('test/browser/worker.js')
		let ready = false
		worker.onmessage = (e) => {
			if (e.data === 'worker ready') {
				ready = true
			} else if(e.data === 'keepalive'){
				worker.onerror = null
				// worker.terminate()
				expect(ready).to.be.true
				done()
			 }else {
				done(Error(e.data))
			}
		}

		worker.onerror = (e) => {
			done(Error(e.message))
		}
	})

	testProto('ws', window.wsPort, () => {
		testProto('wss', window.wssPort)
	})
})


