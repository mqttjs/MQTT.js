
/**
 * _handlePublish
 *
 * @param {Object} packet
 * @api private
 */
/*
those late 2 case should be rewrite to comply with coding style:
case 1:
case 0:
  // do not wait sending a puback
  // no callback passed
  if (1 === qos) {
    this._sendPacket({
      cmd: 'puback',
      messageId: messageId
    });
  }
  // emit the message event for both qos 1 and 0
  this.emit('message', topic, message, packet);
  this.handleMessage(packet, done);
  break;
default:
  // do nothing but every switch mus have a default
  // log or throw an error about unknown qos
  break;
for now i just suppressed the warnings
*/
export async function handlePub (packet) {
  debug('_handlePublish: packet %o', packet)
  done = typeof done !== 'undefined' ? done : nop
  var topic = packet.topic.toString()
  var message = packet.payload
  var qos = packet.qos
  var messageId = packet.messageId
  var that = this
  var options = this.options
  var validReasonCodes = [0, 16, 128, 131, 135, 144, 145, 151, 153]
  debug('_handlePublish: qos %d', qos)
  switch (qos) {
    case 2: {
      options.customHandleAcks(topic, message, packet, function (error, code) {
        if (!(error instanceof Error)) {
          code = error
          error = null
        }
        if (error) { return that.emit('error', error) }
        if (validReasonCodes.indexOf(code) === -1) { return that.emit('error', new Error('Wrong reason code for pubrec')) }
        if (code) {
          that._sendPacket({cmd: 'pubrec', messageId: messageId, reasonCode: code}, done)
        } else {
          that.incomingStore.put(packet, function () {
            that._sendPacket({cmd: 'pubrec', messageId: messageId}, done)
          })
        }
      })
      break
    }
    case 1: {
      // emit the message event
      options.customHandleAcks(topic, message, packet, function (error, code) {
        if (!(error instanceof Error)) {
          code = error
          error = null
        }
        if (error) { return that.emit('error', error) }
        if (validReasonCodes.indexOf(code) === -1) { return that.emit('error', new Error('Wrong reason code for puback')) }
        if (!code) { that.emit('message', topic, message, packet) }
        that.handleMessage(packet, function (err) {
          if (err) {
            return done && done(err)
          }
          that._sendPacket({cmd: 'puback', messageId: messageId, reasonCode: code}, done)
        })
      })
      break
    }
    case 0:
      // emit the message event
      this.emit('message', topic, message, packet)
      this.handleMessage(packet, done)
      break
    default:
      // do nothing
      debug('_handlePublish: unknown QoS. Doing nothing.')
      // log or throw an error about unknown qos
      break
  }
