const test = require('tape')
const _URL = require('url')
const mqtt = require('../../') // package.json will provide 'dist/mqtt.min.js'
// eslint-disable-next-line
const parsed = _URL.parse(document.URL)
const isHttps = parsed.protocol === 'https:'
const port = parsed.port || (isHttps ? 443 : 80)
const host = parsed.hostname
const protocol = isHttps ? 'wss' : 'ws'

const client = mqtt.connect({
	protocolId: 'MQIsdp',
	protocolVersion: 3,
	protocol,
	port,
	host,
	log: console.log.bind(console),
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

test('MQTT.js browser test', (t) => {
	t.plan(6)
	client.on('connect', () => {
		client.on('message', (topic, msg) => {
			t.equal(topic, 'hello', 'should match topic')
			t.equal(msg.toString(), 'Hello World!', 'should match payload')
			client.end(() => {
				t.pass('client should close')
			})
		})

		client.subscribe('hello', (err) => {
			t.error(err, 'no error on subscribe')
			if (!err) {
				client.publish('hello', 'Hello World!', (err2) => {
					t.error(err2, 'no error on publish')
				})
			}
		})
	})

	client.on('error', (err) => {
		t.fail(err, 'no error')
	})

	client.once('close', () => {
		t.pass('should emit close')
	})
})
