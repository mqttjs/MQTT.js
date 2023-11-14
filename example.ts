import mqtt from '.'

const client = mqtt.connect('mqtt://test.mosquitto.org')

const testTopic = 'presence'

client.subscribe(testTopic, (err) => {
	if (!err) {
		console.log('subscribed to', testTopic)
		client.publish(testTopic, 'Hello mqtt', (err2) => {
			if (!err2) {
				console.log('message published')
			} else {
				console.error(err2)
			}
		})
	} else {
		console.error(err)
	}
})

client.on('message', (topic, message) => {
	console.log('received message "%s" from topic "%s"', message, topic)
	client.end()
})
