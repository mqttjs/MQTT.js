import { MqttServer } from '../server'

new MqttServer((client) => {
	client.on('connect', () => {
		client.connack({ returnCode: 0 })
	})
}).listen(3481, 'localhost')
