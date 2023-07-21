const WS = require('ws')

const WebSocketServer = WS.Server
const Connection = require('mqtt-connection')
const http = require('http')

const handleClient = (client) => {
	if (!this.clients) {
		this.clients = {}
	}

	client.on('connect', (packet) => {
		if (packet.clientId === 'invalid') {
			client.connack({ returnCode: 2 })
		} else {
			client.connack({ returnCode: 0 })
		}
		this.clients[packet.clientId] = client
		client.subscriptions = []
	})

	client.on('publish', (packet) => {
		let k
		let c
		let s
		let publish
		switch (packet.qos) {
			case 0:
				break
			case 1:
				client.puback(packet)
				break
			case 2:
				client.pubrec(packet)
				break
		}

		for (k in this.clients) {
			c = this.clients[k]
			publish = false

			for (let i = 0; i < c.subscriptions.length; i++) {
				s = c.subscriptions[i]

				if (s.test(packet.topic)) {
					publish = true
				}
			}

			if (publish) {
				try {
					c.publish({ topic: packet.topic, payload: packet.payload })
				} catch (error) {
					delete this.clients[k]
				}
			}
		}
	})

	client.on('pubrel', (packet) => {
		client.pubcomp(packet)
	})

	client.on('pubrec', (packet) => {
		client.pubrel(packet)
	})

	client.on('pubcomp', () => {
		// Nothing to be done
	})

	client.on('subscribe', (packet) => {
		let qos
		let topic
		let reg
		const granted = []

		for (let i = 0; i < packet.subscriptions.length; i++) {
			qos = packet.subscriptions[i].qos
			topic = packet.subscriptions[i].topic
			reg = new RegExp(
				`${topic.replace('+', '[^/]+').replace('#', '.+')}$`,
			)

			granted.push(qos)
			client.subscriptions.push(reg)
		}

		client.suback({ messageId: packet.messageId, granted })
	})

	client.on('unsubscribe', (packet) => {
		client.unsuback(packet)
	})

	client.on('pingreq', () => {
		client.pingresp()
	})
}

function start(startPort, done) {
	const server = http.createServer()
	const wss = new WebSocketServer({ server })

	wss.on('connection', (ws) => {
		if (!(ws.protocol === 'mqtt' || ws.protocol === 'mqttv3.1')) {
			return ws.close()
		}

		const stream = WS.createWebSocketStream(ws)
		const connection = new Connection(stream)
		handleClient.call(server, connection)
	})
	server.listen(startPort, done)
	server.on('request', (req, res) => {
		res.statusCode = 404
		res.end('Not Found')
	})
	return server
}

const port = process.env.PORT || process.env.AIRTAP_SUPPORT_PORT

if (require.main === module) {
	start(port, (err) => {
		if (err) {
			console.error(err)
			return
		}
		console.log('tunnelled server started on port', port)
	})
}
