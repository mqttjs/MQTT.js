import { expect } from '../../node_modules/@esm-bundle/chai/esm/chai.js';

const mqtt = window.mqtt

const client = mqtt.connect('ws://localhost:4000',{
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

describe('MQTT.js browser test', () => {
	it('should connect to the server', async () => {

		return new Promise((resolve, reject) => {
			client.on('connect', () => {
				client.on('message', (topic, msg) => {
					expect(topic).to.equal('hello', 'should match topic')
					expect(msg.toString()).to.equal('Hello World!', 'should match payload')
					client.end(() => {
						console.log('client should close')
						resolve()
					})
				})

				client.subscribe('hello', (err) => {
					expect(err).to.not.exist
					if (!err) {
						client.publish('hello', 'Hello World!', (err2) => {
							expect(err2).to.not.exist
							if (err2) {
								reject(err2)
							}
						})
					} else {
						reject(err)
					}
				})
			})

			client.on('error', (err) => {
				console.log('client error', err)
				reject(err)
			})

			client.once('close', () => {
				console.log('client closed')
			})
		})
	})
})
