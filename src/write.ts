import * as mqtt from 'mqtt-packet';
import { MqttClient } from './client.js';
import { logger } from './util/logger.js';

export async function write(client: MqttClient, packet: mqtt.Packet): Promise<void> {
  /* TODO: Enforce maximum packet size */
  logger.trace(`writing packet: ${JSON.stringify(packet)}`);
  if (!client.connected && !client.connecting) throw new Error('connection closed');

  /**
   * If writeToStream returns true, we can immediately continue. Otherwise,
   * either we need to wait for the 'drain' event or the client has errored.
   */
  if (mqtt.writeToStream(packet, client.conn)) return;
  // if we get an error while writing to the packet stream in mqtt-packet v8, then the stream will synchronously be set to 'destroyed' immediately, so we can 
  // check for errors by checking if the connection is destroyed after writing to stream.
  if (client.conn.destroyed) throw new Error('stream destroyed while attempting to write');

  

  /** TODO: if there is an issue, write could potentially stall forever
   * We should look into if we should have a timeout here or if the timeout should be
   */
  /**
   * TODO: Need to make sure that this promise settles if the client errors
   * before the 'drain' event is emitted. Aedes does a weird hack to make it
   * work, but it's not clear if it's the right thing to do. See Aedes:
   * https://github.com/moscajs/aedes/blob/39ccdb554d9e32113216e5f7180d3297314e5e12/lib/client.js#L193-L196
   */
  if (!client.errored) return new Promise((resolve) => client.conn.once('drain', resolve));
}
