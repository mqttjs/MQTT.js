'use strict'

import { handleConnect } from './connect'
import { handleConnAck } from './connack'
import { handleDisconnect } from './disconnect'
import { handlePing } from './ping'
import { handlePingReq } from './pingreq'
import { handlePingResp } from './pingresp'
import { handlePub } from './pub'
import { handlePubRec } from './pubrec'
import { handlePubRel } from './pubrel'
import { handlePubComp } from './pubcomp'
import { handlePubAck } from './puback'
import { handleSub } from './sub'
import { handleSubAck } from './suback'
import { handleUnsub } from './unsub'
import { handleUnsubAck } from './unsuback'
import { handleAuth } from './auth'
import { MqttClient } from '../client'
import { PacketCmd, Packet } from 'mqtt-packet'

export async function handle (client: MqttClient, cmd: PacketCmd, options: unknown) {
  let result
  switch (cmd) {
    case 'auth':
      // result = await handleAuth(client, options)
      break
    case 'connect':
      result = await handleConnect(client, options)
      break
    case 'connack':
      result = await handleConnAck(client, options)
      break
    case 'publish':
      // result = await handlePub(client, options)
      break
    case 'subscribe':
      // result = await handleSub(client, options)
      break
    case 'suback':
      // result = await handleSubAck(client, options)
      break
    case 'unsubscribe':
      // result = await handleUnsub(client, options)
      break
    case 'unsuback':
      // result = await handleUnsubAck(client, options)
      break
    case 'pubcomp':
      // result = await handlePubComp(client, options)
      break
    case 'puback':
      // result = await handlePubAck(client, options)
      break
    case 'pubrel':
      // result = await handlePubRel(client, options)
      break
    case 'pubrec':
      // result = await handlePubRec(client, options)
      break
    case 'pingreq':
      // result = await handlePingReq(client, options)
      break
    case 'pingresp':
      // result = await handlePingResp(client, options)
      break
    case 'disconnect':
      // result = await handleDisconnect(client, options)
      // client._disconnected = true
      break
  }

  return result
}
