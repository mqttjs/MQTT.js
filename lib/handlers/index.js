const handlePublish = require('./publish')
const handleAuth = require('./auth')
const handleConnack = require('./connack')
const handleAck = require('./ack')
const handlePubRel = require('./pubrel')

function handle(client, packet, done) {
    const options = client.options

    if (options.protocolVersion === 5 && options.properties && options.properties.maximumPacketSize && options.properties.maximumPacketSize < packet.length) {
      client.emit('error', new Error('exceeding packets size ' + packet.cmd))
      client.end({ reasonCode: 149, properties: { reasonString: 'Maximum packet size was exceeded' } })
      return client
    }
    client.log('_handlePacket :: emitting packetreceive')
    client.emit('packetreceive', packet)

    switch (packet.cmd) {
      case 'publish':
        handlePublish(client, packet, done)
        break
      case 'puback':
      case 'pubrec':
      case 'pubcomp':
      case 'suback':
      case 'unsuback':
        handleAck(client, packet, done)
        done()
        break
      case 'pubrel':
        handlePubRel(client, packet, done)
        done()
        break
      case 'connack':
        handleConnack(client, packet, done)
        break
      case 'auth':
        handleAuth(client, packet)
        done()
        break
      case 'pingresp':
        client.pingResp = true
        done()
        break
      case 'disconnect':
        client.emit('disconnect', packet)
        done()
        break
      default:
        // do nothing
        // maybe we should do an error handling
        // or just log it
        break
    }
}

module.exports = handle