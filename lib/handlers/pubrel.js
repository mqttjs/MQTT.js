

function handlePubRel(client, packet, done) {
    client.log('handling pubrel packet')
    callback = typeof callback !== 'undefined' ? callback : nop
    const messageId = packet.messageId

    const comp = { cmd: 'pubcomp', messageId }

    client.incomingStore.get(packet, function (err, pub) {
      if (!err) {
        client.emit('message', pub.topic, pub.payload, pub)
        client.handleMessage(pub, function (err) {
          if (err) {
            return callback(err)
          }
          client.incomingStore.del(pub, nop)
          client._sendPacket(comp, callback)
        })
      } else {
        client._sendPacket(comp, callback)
      }
    })
}

module.exports = handlePubRel