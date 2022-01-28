import mqtt from 'mqtt-packet'
import { MqttClient } from './client.js'

export function write (client: MqttClient, packet: mqtt.Packet): Promise<void> {
  let error: Error | null = null
  return new Promise((resolve, reject) => {
    if (client.connecting || client.connected) {
      try {
        mqtt.writeToStream(packet, client.conn)
        if (!client.errored) {
          client.conn.once('drain', resolve)
          return
        }
      } catch (e) {
        error = new Error('packet received not valid')
      }
    } else {
      error = new Error('connection closed')
    }

    if (error) {
      reject(error)
    }
  })
}
