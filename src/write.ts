import mqtt from 'mqtt-packet'
import { MqttClient } from './client'

export async function write (client: MqttClient, packet: mqtt.Packet) {
  let error = null
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