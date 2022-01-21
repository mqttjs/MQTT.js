import mqtt, { Packet } from 'mqtt-packet'
import { MqttClient } from './client.js'
import { logger } from './utils/logger.js'
import * as v8 from 'v8'

export function write (client: MqttClient, packet: mqtt.Packet): Promise<void> {
  let error: Error | null = null
  return new Promise((resolve, reject) => {
    const aliasedPacket = applyTopicAlias(client, packet)

    if (client.connecting || client.connected) {
      try {
        mqtt.writeToStream(aliasedPacket, client.conn)
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


export function applyTopicAlias (client: MqttClient, pkt: Packet): Packet {
  let packet = v8.deserialize(v8.serialize(pkt)) // cloning: https://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-deep-clone-an-object-in-javascript
  if (client._options.protocolVersion === 5) {
    if (packet.cmd === 'publish') {
      var alias
      if (packet.properties) {
        alias = packet.properties.topicAlias
      }
      var topic = packet.topic.toString()
      if (client.topicAliasSend) {
        if (alias) {
          if (topic.length !== 0) {
            // register topic alias
            logger.info('applyTopicAlias :: register topic: %s - alias: %d', topic, alias)
            if (!client.topicAliasSend.put(topic, alias)) {
              logger.info('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
              throw new Error('Sending Topic Alias out of range')
            }
          }
        } else {
          if (topic.length !== 0) {
            if (client._options.autoAssignTopicAlias) {
              alias = client.topicAliasSend.getAliasByTopic(topic)
              if (alias) {
                packet.topic = ''
                packet.properties = {...(packet.properties), topicAlias: alias}
                logger.info('applyTopicAlias :: auto assign(use) topic: %s - alias: %d', topic, alias)
              } else {
                alias = client.topicAliasSend.getLruAlias()
                client.topicAliasSend.put(topic, alias)
                packet.properties = {...(packet.properties), topicAlias: alias}
                logger.info('applyTopicAlias :: auto assign topic: %s - alias: %d', topic, alias)
              }
            } else if (client._options.autoUseTopicAlias) {
              alias = client.topicAliasSend.getAliasByTopic(topic)
              if (alias) {
                packet.topic = ''
                packet.properties = {...(packet.properties), topicAlias: alias}
                logger.info('applyTopicAlias :: auto use topic: %s - alias: %d', topic, alias)
              }
            }
          }
        }
      } else if (alias) {
        logger.info('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
        throw new Error('Sending Topic Alias out of range')
      }
    }
  }
  return packet
}
