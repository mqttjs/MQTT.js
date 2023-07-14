

function handleAck(client, packet, done) {
    /* eslint no-fallthrough: "off" */
    const messageId = packet.messageId
    const type = packet.cmd
    let response = null
    const cb = client.outgoing[messageId] ? client.outgoing[messageId].cb : null
    let err

    // Checking `!cb` happens to work, but it's not technically "correct".
    //
    // Why? client code assumes client "no callback" is the same as client "we're not
    // waiting for responses" (puback, pubrec, pubcomp, suback, or unsuback).
    //
    // It would be better to check `if (!client.outgoing[messageId])` here, but
    // there's no reason to change it and risk (another) regression.
    //
    // The only reason client code works is becaues code in MqttClient.publish,
    // MqttClinet.subscribe, and MqttClient.unsubscribe ensures client we will
    // have a callback even if the user doesn't pass one in.)
    if (!cb) {
        client.log('_handleAck :: Server sent an ack in error. Ignoring.')
        // Server sent an ack in error, ignore it.
        return
    }

    // Process
    client.log('_handleAck :: packet type', type)
    switch (type) {
        case 'pubcomp':
        // same thing as puback for QoS 2
        case 'puback': {
            const pubackRC = packet.reasonCode
            // Callback - we're done
            if (pubackRC && pubackRC > 0 && pubackRC !== 16) {
                err = new Error('Publish error: ' + errors[pubackRC])
                err.code = pubackRC
                client._removeOutgoingAndStoreMessage(messageId, function () {
                    cb(err, packet)
                })
            } else {
                client._removeOutgoingAndStoreMessage(messageId, cb)
            }

            break
        }
        case 'pubrec': {
            response = {
                cmd: 'pubrel',
                qos: 2,
                messageId
            }
            const pubrecRC = packet.reasonCode

            if (pubrecRC && pubrecRC > 0 && pubrecRC !== 16) {
                err = new Error('Publish error: ' + errors[pubrecRC])
                err.code = pubrecRC
                client._removeOutgoingAndStoreMessage(messageId, function () {
                    cb(err, packet)
                })
            } else {
                client._sendPacket(response)
            }
            break
        }
        case 'suback': {
            delete client.outgoing[messageId]
            client.messageIdProvider.deallocate(messageId)
            for (let grantedI = 0; grantedI < packet.granted.length; grantedI++) {
                if ((packet.granted[grantedI] & 0x80) !== 0) {
                    // suback with Failure status
                    const topics = client.messageIdToTopic[messageId]
                    if (topics) {
                        topics.forEach(function (topic) {
                            delete client._resubscribeTopics[topic]
                        })
                    }
                }
            }
            delete client.messageIdToTopic[messageId]
            client._invokeStoreProcessingQueue()
            cb(null, packet)
            break
        }
        case 'unsuback': {
            delete client.outgoing[messageId]
            client.messageIdProvider.deallocate(messageId)
            client._invokeStoreProcessingQueue()
            cb(null)
            break
        }
        default:
            client.emit('error', new Error('unrecognized packet type'))
    }

    if (client.disconnecting &&
        Object.keys(client.outgoing).length === 0) {
        client.emit('outgoingEmpty')
    }
}

module.exports = handleAck;