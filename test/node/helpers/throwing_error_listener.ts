/**
 * A client built without an `error` listener rejects a packet, so emitting
 * the error throws. Reports, in order, what still happens afterwards.
 */
import net from 'net'
import { MqttServer } from '../server'
import mqtt from '../../../src'

const events: string[] = []

const report = () => {
	process.send(events, () => process.exit(0))
}

process.on('uncaughtException', (err) => {
	events.push(`uncaught: ${err.message}`)
})

const server = new MqttServer((serverClient) => {
	serverClient.on('connect', () => serverClient.connack({ returnCode: 0 }))
	serverClient.on('error', () => {})
})

server.listen(0, () => {
	const { port } = server.address() as net.AddressInfo
	const client = new mqtt.MqttClient(() => net.connect(port, 'localhost'), {
		reconnectPeriod: 0,
	})
	client.on('close', () => events.push('close'))
	client.once('connect', () => {
		client.publish(42 as unknown as string, 'payload')
		client.end(() => {
			events.push('end callback')
			report()
		})
	})
	// a skipped `end()` callback must still produce a report
	setTimeout(report, 3000).unref()
})
