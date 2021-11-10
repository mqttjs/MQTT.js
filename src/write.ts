import mqtt, { IPacket, Packet } from 'mqtt-packet'
import { MqttClient } from './client'
import rfdc from 'rfdc'

const logger = require('pino')()
const clone = rfdc()

export function write (client: MqttClient, packet: mqtt.Packet): Promise<void> {
  let error: Error | null = null
  return new Promise((resolve, reject) => {
    const topicAliasErr = applyTopicAlias(client, packet)

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


export function applyTopicAlias (client: MqttClient, pkt: Packet): Packet {
  let packet = clone(pkt)
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
            logger('applyTopicAlias :: register topic: %s - alias: %d', topic, alias)
            if (!client.topicAliasSend.put(topic, alias)) {
              logger('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
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
                logger('applyTopicAlias :: auto assign(use) topic: %s - alias: %d', topic, alias)
              } else {
                alias = client.topicAliasSend.getLruAlias()
                client.topicAliasSend.put(topic, alias)
                packet.properties = {...(packet.properties), topicAlias: alias}
                logger('applyTopicAlias :: auto assign topic: %s - alias: %d', topic, alias)
              }
            } else if (client._options.autoUseTopicAlias) {
              alias = client.topicAliasSend.getAliasByTopic(topic)
              if (alias) {
                packet.topic = ''
                packet.properties = {...(packet.properties), topicAlias: alias}
                logger('applyTopicAlias :: auto use topic: %s - alias: %d', topic, alias)
              }
            }
          }
        }
      } else if (alias) {
        logger('applyTopicAlias :: error out of range. topic: %s - alias: %d', topic, alias)
        throw new Error('Sending Topic Alias out of range')
      }
    }
  }
  return packet
}
