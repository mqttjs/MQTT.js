import { MqttClient } from "../client"
import { Packet } from "mqtt-packet"
import { write } from "../write"

export async function handleConnect (client: MqttClient, packet: Packet): Promise<void> {
  clearTimeout(client.connackTimer)
  client.connackTimer = null
  client.connecting = true
  client.connackTimer = setTimeout(function () {
    client._cleanUp(true)
  }, client._options.connectTimeout)

  await write(client, packet)
  return 
}
