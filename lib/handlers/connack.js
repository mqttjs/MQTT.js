

function handleConnack(client, packet, done) {
    client.log('_handleConnack')
    const options = client.options
    const version = options.protocolVersion
    const rc = version === 5 ? packet.reasonCode : packet.returnCode

    clearTimeout(client.connackTimer)
    delete client.topicAliasSend

    if (packet.properties) {
      if (packet.properties.topicAliasMaximum) {
        if (packet.properties.topicAliasMaximum > 0xffff) {
          client.emit('error', new Error('topicAliasMaximum from broker is out of range'))
          return
        }
        if (packet.properties.topicAliasMaximum > 0) {
          client.topicAliasSend = new TopicAliasSend(packet.properties.topicAliasMaximum)
        }
      }
      if (packet.properties.serverKeepAlive && options.keepalive) {
        options.keepalive = packet.properties.serverKeepAlive
        client._shiftPingInterval()
      }
      if (packet.properties.maximumPacketSize) {
        if (!options.properties) { options.properties = {} }
        options.properties.maximumPacketSize = packet.properties.maximumPacketSize
      }
    }

    if (rc === 0) {
      client.reconnecting = false
      client._onConnect(packet)
    } else if (rc > 0) {
      const err = new Error('Connection refused: ' + errors[rc])
      err.code = rc
      client.emit('error', err)
    }

    done()
}

module.exports = handleConnack