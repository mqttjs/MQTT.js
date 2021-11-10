import { handleConnect } from './connect'
import { handleConnAck } from './connack'
// import { handleDisconnect } from './disconnect'
// import { handlePing } from './ping'
import { handlePingReq } from './pingreq'
// import { handlePingResp } from './pingresp'
// import { handlePub } from './pub'
// import { handlePubRec } from './pubrec'
// import { handlePubRel } from './pubrel'
// import { handlePubComp } from './pubcomp'
// import { handlePubAck } from './puback'
// import { handleSub } from './sub'
// import { handleSubAck } from './suback'
// import { handleUnsub } from './unsub'
// import { handleUnsubAck } from './unsuback'
// import { handleAuth } from './auth'
import { MqttClient } from '../client'
import { Packet, writeToStream } from 'mqtt-packet'
import { handleAuth } from './auth'
import { ReasonCodeErrors } from '../errors'

export class ConnectionRefusedError extends Error {
  code?: number
}

export async function handleInboundPackets(client: MqttClient, packet: Packet): Promise<void> {
  /* eslint no-fallthrough: "off" */
  var messageId = packet.messageId
  var type = packet.cmd
  var response = null
  var cb = this.outgoing[messageId] ? this.outgoing[messageId].cb : null
  var that = this
  var err

  if (!cb) {
    // Server sent an ack in error, ignore it.
    return
  }

  switch (packet.cmd) {

  }

}

export async function handle(client: MqttClient, packet: Packet): Promise<void> {
  let result
  switch (packet.cmd) {
    case 'auth':
      // TODO: Does this follow the spec correctly? Shouldn't auth be able to be sent at any time???
      result = await handleAuth(client, packet)
      break
    case 'connect':
      await handleConnect(client, packet)
      break
    case 'publish':
      // result = await handlePub(client, options)
      break
    case 'subscribe':
      // result = await handleSub(client, options)
      break
    case 'unsubscribe':
      // result = await handleUnsub(client, options)
      break
    case 'pubrel':
    case 'pubrec':
    case 'pingreq':
      result = await handlePingReq(client, packet)
      break
    case 'pubcomp':
      // fallthrough
    case 'puback':
      var pubackRC = packet.reasonCode
      // Callback - we're done
      if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
        const err = new ConnectionRefusedError('Publish error: ' + ReasonCodeErrors[pubackRC as keyof typeof ReasonCodeErrors])
        err.code = pubackRC
        throw err
      }
      delete client.outgoing[messageId]
      client.outgoingStore.del(packet, cb)
      client.messageIdProvider.deallocate(messageId)
      client._invokeStoreProcessingQueue()
    case 'pingresp':
      // result = await handlePingResp(client, options)
      break
    case 'disconnect':
      // result = await handleDisconnect(client, options)
      // client._disconnected = true
      break
    case 'connack':
      await handleConnAck(client, packet)
      break
    case 'pubcomp':
      // same thing as puback for QoS 2
    case 'unsuback':
      // result = await handleUnsubAck(client, options)
      break
    case 'suback':
        // result = await handleSubAck(client, options)
        break
  }

  return result
}
