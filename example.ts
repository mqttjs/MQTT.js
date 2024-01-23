import mqtt from '.'

const client = mqtt.connect('mqtt://test.mosquitto.org', {
	keepalive: 10,
	reconnectPeriod: 15000,
})

const testTopic = 'presence'

function publish() {
	client.publish(
		testTopic,
		`Hello mqtt ${new Date().toISOString()}`,
		(err2) => {
			if (!err2) {
				console.log('message published')
			} else {
				console.error(err2)
			}
		},
	)
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
	setTimeout(() => {
		publish()
	}, 2000)
})

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
