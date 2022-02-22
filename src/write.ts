import * as mqtt from 'mqtt-packet'
import { MqttClient } from './client.js'

export async function write (client: MqttClient, packet: mqtt.Packet): Promise<void> {
  if (!client.connected && !client.connecting)
    throw new Error('connection closed')
  
  /**
   * If writeToStream returns true, we can immediately continue. Otherwise,
   * either we need to wait for the 'drain' event or the client has errored.
   */
  if (mqtt.writeToStream(packet, client.conn)) return

  if (!client.errored)
    return new Promise(resolve => client.conn.once('drain', resolve))
}
