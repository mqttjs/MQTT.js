import mqtt from '.'

const client = mqtt.connect('mqtts://test.mosquitto.org', {
	keepalive: 60,
	port: 8883,
	reconnectPeriod: 15000,
	rejectUnauthorized: false,
})

const testTopic = 'presence'

function publish() {
	const msg = `Hello mqtt ${new Date().toISOString()}`
	client.publish(testTopic, msg, { qos: 1 }, (err2) => {
		if (!err2) {
			console.log('message published')
		} else {
			console.error(err2)
		}
	})
}

client.subscribe(testTopic, (err) => {
	if (!err) {
		console.log('subscribed to', testTopic)
	} else {
		console.error(err)
	}
})

client.on('message', (topic, message) => {
	console.log('received message "%s" from topic "%s"', message, topic)
})

setInterval(() => {
	publish()
}, 2000)

client.on('error', (err) => {
	console.error(err)
})

client.on('connect', () => {
	console.log('connected')
	publish()
})

client.on('disconnect', () => {
	console.log('disconnected')
})

client.on('offline', () => {
	console.log('offline')
})

client.on('reconnect', () => {
	console.log('reconnect')
})
