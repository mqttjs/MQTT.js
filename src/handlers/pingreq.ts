import { IPingreqPacket } from "mqtt-packet";
import { MqttClient } from "../client";
import { write } from "../write";

export async function handlePingReq (client: MqttClient, packet: IPingreqPacket) {
  write(client, packet)
  // client._sendPacket({ cmd: 'pingreq' })
}
