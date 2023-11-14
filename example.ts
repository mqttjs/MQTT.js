import mqtt from '.'

const client = mqtt.connect('mqtt://test.mosquitto.org')

const topic = 'presence'

client.subscribe(topic, (err) => {
	if (!err) {
		console.log('subscribed to', topic)
		client.publish(topic, 'Hello mqtt', (err) => {
			if (!err) {
				console.log('message published')
			} else {
				console.error(err)
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
