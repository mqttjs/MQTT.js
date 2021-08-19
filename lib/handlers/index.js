import {handleConnect} from './connect'
import {handleConnAck} from './connack'
import {handleDisconnect} from './disconnect'
import {handlePing} from './ping'
import {handlePingReq} from './pingreq'
import {handlePingResp} from './pingresp'
import {handlePub} from './pub'
import {handlePubRec} from './pubrec'
import {handlePubRel} from './pubrel'
import {handlePubComp} from './pubcomp'
import {handlePubAck} from './puback'
import {handleSub} from './sub'
import {handleSubAck} from './suback'
import {handleUnsub} from './unsub'
import {handleUnsubAck} from './unsuback'
import { handleAuth } from './auth'

export async function handle (client, packet) {
  let result
  switch (packet.cmd) {
    case 'auth':
      result = await handleAuth(client, packet)
      break
    case 'connect':
      result = await handleConnect(client, packet)
      break
    case 'connack':
      result = await handleConnAck(client, packet)
      break
    case 'publish':
      result = await handlePub(client, packet)
      break
    case 'subscribe':
      result = await handleSub(client, packet)
      break
    case 'suback':
      result = await handleSubAck(client, packet)
      break
    case 'unsubscribe':
      result = await handleUnsub(client, packet)
      break
    case 'unsuback':
      result = await handleUnsubAck(client, packet)
      break
    case 'pubcomp':
      result = await handlePubComp(client, packet)
      break
    case 'puback':
      result = await handlePubAck(client, packet)
      break
    case 'pubrel':
      result = await handlePubRel(client, packet)
      break
    case 'pubrec':
      result = await handlePubRec(client, packet)
      break
    case 'ping':
      result = await handlePing(client, packet)
      break
    case 'pingreq':
      result = await handlePingReq(client, packet)
      break
    case 'pingresp':
      result = await handlePingResp(client, packet)
      break
    case 'disconnect':
      result = await handleDisconnect(client, packet)
      client._disconnected = true
      break
  }

  return result
}
