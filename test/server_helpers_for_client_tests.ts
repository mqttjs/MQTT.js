import { MqttServer, MqttSecureServer, MqttServerListener } from './server'
import _debug from 'debug'

import path from 'path'
import fs from 'fs'

import http from 'http'
import WebSocket from 'ws'
import MQTTConnection from 'mqtt-connection'
import { Server } from 'net'

const KEY = path.join(__dirname, 'helpers', 'tls-key.pem')
const CERT = path.join(__dirname, 'helpers', 'tls-cert.pem')

const debug = _debug('mqttjs:server_helpers_for_client_tests')

/**
 * This will build the client for the server to use during testing, and set up the
 * server side client based on mqtt-connection for handling MQTT messages.
 * @param {String} protocol - 'mqtt', 'mqtts' or 'ws'
 * @param {Function} handler - event handler
 */
export default function serverBuilder(
	protocol: string,
	handler?: MqttServerListener,
): Server {
	const defaultHandler: MqttServerListener = (serverClient) => {
		serverClient.on('auth', (packet) => {
			if (serverClient.writable) return false
			const rc = 'reasonCode'
			const connack = {}
			connack[rc] = 0
			serverClient.connack(connack)
		})
		serverClient.on('connect', (packet) => {
			if (!serverClient.writable) return false
			let rc = 'returnCode'
			const connack = {}
			if (serverClient.options.protocolVersion >= 4) {
				connack['sessionPresent'] = false
			}
			if (
				serverClient.options &&
				serverClient.options.protocolVersion === 5
			) {
				rc = 'reasonCode'
				if (packet.clientId === 'invalid') {
					connack[rc] = 128
				} else {
					connack[rc] = 0
				}
			} else if (packet.clientId === 'invalid') {
				connack[rc] = 2
			} else {
				connack[rc] = 0
			}
			if (packet.properties && packet.properties.authenticationMethod) {
				return false
			}
			serverClient.connack(connack)
		})

		serverClient.on('publish', (packet) => {
			if (!serverClient.writable) return false
			setImmediate(() => {
				switch (packet.qos) {
					case 0:
						break
					case 1:
						serverClient.puback(packet)
						break
					case 2:
						serverClient.pubrec(packet)
						break
				}
			})
		})

		serverClient.on('pubrel', (packet) => {
			if (!serverClient.writable) return false
			serverClient.pubcomp(packet)
		})

		serverClient.on('pubrec', (packet) => {
			if (!serverClient.writable) return false
			serverClient.pubrel(packet)
		})

		serverClient.on('pubcomp', () => {
			// Nothing to be done
		})

		serverClient.on('subscribe', (packet) => {
			if (!serverClient.writable) return false
			serverClient.suback({
				messageId: packet.messageId,
				granted: packet.subscriptions.map((e) => e.qos),
			})
		})

		serverClient.on('unsubscribe', (packet) => {
			if (!serverClient.writable) return false
			packet.granted = packet.unsubscriptions.map(() => 0)
			serverClient.unsuback(packet)
		})

		serverClient.on('pingreq', () => {
			if (!serverClient.writable) return false
			serverClient.pingresp()
		})

		serverClient.on('end', () => {
			debug('disconnected from server')
		})
	}

	if (!handler) {
		handler = defaultHandler
	}

	if (protocol === 'mqtt') {
		return new MqttServer(handler)
	}
	if (protocol === 'mqtts') {
		return new MqttSecureServer(
			{
				key: fs.readFileSync(KEY),
				cert: fs.readFileSync(CERT),
			},
			handler,
		)
	}
	if (protocol === 'ws') {
		const attachWebsocketServer = (server) => {
			const webSocketServer = new WebSocket.Server({
				server,
				perMessageDeflate: false,
			})

			webSocketServer.on('connection', (ws) => {
				// server.connectionList.push(ws)
				const stream = WebSocket.createWebSocketStream(ws)
				const connection = new MQTTConnection(stream)
				connection.protocol = ws.protocol
				server.emit('client', connection)
				stream.on('error', () => {})
				connection.on('error', () => {})
				connection.on('close', () => {})
			})
		}

		const httpServer = http.createServer()
		// httpServer.connectionList = []
		attachWebsocketServer(httpServer)
		httpServer.on('client', handler)
		return httpServer
	}
}
