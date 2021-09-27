import { MqttClient } from "../client"
import { IConnectPacket } from "mqtt-packet"
import { ConnectOptions } from ".."

export async function handleConnect (client: MqttClient, opts: ConnectOptions) {

  client.conn
  // if (this.disconnected) {
  //   this.emit('connect', packet)
  //   return
  // }

  // var that = this

  // this.messageIdProvider.clear()
  // this._setupPingTimer()
  // this._resubscribe(packet)

  // this.connected = true

  // function startStreamProcess () {
  //   var outStore = that.outgoingStore.createStream()

  //   function clearStoreProcessing () {
  //     that._storeProcessing = false
  //     that._packetIdsDuringStoreProcessing = {}
  //   }

  //   that.once('close', remove)
  //   outStore.on('error', function (err) {
  //     clearStoreProcessing()
  //     that._flushStoreProcessingQueue()
  //     that.removeListener('close', remove)
  //     that.emit('error', err)
  //   })

  //   function remove () {
  //     outStore.destroy()
  //     outStore = null
  //     that._flushStoreProcessingQueue()
  //     clearStoreProcessing()
  //   }

  //   function storeDeliver () {
  //     // edge case, we wrapped this twice
  //     if (!outStore) {
  //       return
  //     }
  //     that._storeProcessing = true

  //     var packet = outStore.read(1)

  //     var cb

  //     if (!packet) {
  //       // read when data is available in the future
  //       outStore.once('readable', storeDeliver)
  //       return
  //     }

  //     // Skip already processed store packets
  //     if (that._packetIdsDuringStoreProcessing[packet.messageId]) {
  //       storeDeliver()
  //       return
  //     }

  //     // Avoid unnecessary stream read operations when disconnected
  //     if (!that.disconnecting && !that.reconnectTimer) {
  //       cb = that.outgoing[packet.messageId] ? that.outgoing[packet.messageId].cb : null
  //       that.outgoing[packet.messageId] = {
  //         volatile: false,
  //         cb: function (err, status) {
  //           // Ensure that the original callback passed in to publish gets invoked
  //           if (cb) {
  //             cb(err, status)
  //           }

  //           storeDeliver()
  //         }
  //       }
  //       that._packetIdsDuringStoreProcessing[packet.messageId] = true
  //       if (that.messageIdProvider.register(packet.messageId)) {
  //         that._sendPacket(packet)
  //       } else {
  //         debug('messageId: %d has already used.', packet.messageId)
  //       }
  //     } else if (outStore.destroy) {
  //       outStore.destroy()
  //     }
  //   }

  //   outStore.on('end', function () {
  //     var allProcessed = true
  //     for (var id in that._packetIdsDuringStoreProcessing) {
  //       if (!that._packetIdsDuringStoreProcessing[id]) {
  //         allProcessed = false
  //         break
  //       }
  //     }
  //     if (allProcessed) {
  //       clearStoreProcessing()
  //       that.removeListener('close', remove)
  //       that._invokeAllStoreProcessingQueue()
  //       that.emit('connect', packet)
  //     } else {
  //       startStreamProcess()
  //     }
  //   })
  //   storeDeliver()
  // }
  // // start flowing
  // startStreamProcess()
}
