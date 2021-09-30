import { debug } from "console"
import { IConnackPacket } from "mqtt-packet"
import { MqttClient } from "../client"
import { ReasonCodeErrors } from "../errors"

export async function handleConnAck (this: any, client: MqttClient, packet: IConnackPacket) {
  // TODO: What number should this be if there is there is no reason code provided by the broker???
  const rc: number = (client._options.protocolVersion === 5 ? packet.reasonCode : packet.returnCode) || -1
  // Once the CONNACK Packet is received, we can clear the connackTimer on the client,
  // so as not to trigger an error.
  clearTimeout(client.connackTimer)

  // if the Packet has properties, we want to update the options in the client.
  if (packet.properties) {
    if (packet.properties.topicAliasMaximum) {
      if (!client._options.properties) { client._options.properties = {} }
      client._options.properties.topicAliasMaximum = packet.properties.topicAliasMaximum
    }
    if (packet.properties.serverKeepAlive && client._options.keepalive) {
      client._options.keepalive = packet.properties.serverKeepAlive
       // When sending a packet, reschedule the ping timer
      client._shiftPingInterval()
    }
    if (packet.properties.maximumPacketSize) {
      if (!client._options.properties) { client._options.properties = {} }
      client._options.properties.maximumPacketSize = packet.properties.maximumPacketSize
    }
  }

  // The response code indicates whether the connection is successful.
  // If there is a response code of 0, then the client is connected to the
  // broker successfully and it can continue functioning. 
  // Otherwise it should emit an error indicating the connection to the 
  // specified broker was refused, providing the translation for the specific
  // error code.
  // Error cod

  if (rc === 0) {
    client.reconnecting = false
    _onConnect(client, packet)
  } else if (rc > 0 && rc in Object.keys(ReasonCodeErrors)) {
    var err = new ConnectionRefusedError('Connection refused: ' + ReasonCodeErrors[rc as keyof ReasonCodeErrors])
    err.code = rc
    this.emit('error', err)
  }
}

function _onConnect (client: MqttClient, packet: IConnackPacket) {
  if (client.disconnected) {
    client.emit('connect', packet)
    return
  }


  client.messageIdProvider.clear()
  client._setupPingTimer()
  client._resubscribe(packet)

  client.connected = true

  const startStreamProcess =  () => {
    var outStore = client.outgoingStore.createStream()

    function clearStoreProcessing () {
      client._storeProcessing = false
      client._packetIdsDuringStoreProcessing = {}
    }

    client.once('close', remove)
    outStore.on('error', function (err: any) {
      clearStoreProcessing()
      client._flushStoreProcessingQueue()
      client.removeListener('close', remove)
      client.emit('error', err)
    })

    function remove () {
      outStore.destroy()
      outStore = null
      client._flushStoreProcessingQueue()
      clearStoreProcessing()
    }

    function storeDeliver () {
      // edge case, we wrapped this twice
      if (!outStore) {
        return
      }
      client._storeProcessing = true

      var packet = outStore.read(1)

      var cb: (arg0: any, arg1: any) => void

      if (!packet) {
        // read when data is available in the future
        outStore.once('readable', storeDeliver)
        return
      }

      // Skip already processed store packets
      if (client._packetIdsDuringStoreProcessing[packet.messageId]) {
        storeDeliver()
        return
      }

      // Avoid unnecessary stream read operations when disconnected
      if (!client.disconnecting && !client.reconnectTimer) {
        cb = client.outgoing[packet.messageId] ? client.outgoing[packet.messageId].cb : null
        client.outgoing[packet.messageId] = {
          volatile: false,
          cb: function (err: any, status: any) {
            // Ensure that the original callback passed in to publish gets invoked
            if (cb) {
              cb(err, status)
            }

            storeDeliver()
          }
        }
        client._packetIdsDuringStoreProcessing[packet.messageId] = true
        if (client.messageIdProvider.register(packet.messageId)) {
          client._sendPacket(packet)
        } else {
          debug('messageId: %d has already used.', packet.messageId)
        }
      } else if (outStore.destroy) {
        outStore.destroy()
      }
    }

    outStore.on('end', function () {
      var allProcessed = true
      for (var id in client._packetIdsDuringStoreProcessing) {
        if (!client._packetIdsDuringStoreProcessing[id]) {
          allProcessed = false
          break
        }
      }
      if (allProcessed) {
        clearStoreProcessing()
        client.removeListener('close', remove)
        client._invokeAllStoreProcessingQueue()
        client.emit('connect', packet)
      } else {
        startStreamProcess()
      }
    })
    storeDeliver()
  }
  // start flowing
  startStreamProcess()
}