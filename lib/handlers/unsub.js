/**
 * unsubscribe - unsubscribe from topic(s)
 *
 * @param {String, Array} topic - topics to unsubscribe from
 * @param {Object} [opts] - optional subscription options, includes:
 *    {Object} properties - properties of unsubscribe packet
 * @param {Function} [callback] - callback fired on unsuback
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.unsubscribe('topic');
 * @example client.unsubscribe('topic', console.log);
 */

export async function handleUnsub () {
  var that = this
  var args = new Array(arguments.length)
  for (var i = 0; i < arguments.length; i++) {
    args[i] = arguments[i]
  }
  var topic = args.shift()
  var callback = args.pop() || nop
  var opts = args.pop()
  if (typeof topic === 'string') {
    topic = [topic]
  }

  if (typeof callback !== 'function') {
    opts = callback
    callback = nop
  }

  var invalidTopic = validations.validateTopics(topic)
  if (invalidTopic !== null) {
    setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
    return this
  }

  if (that._checkDisconnecting(callback)) {
    return this
  }

  var unsubscribeProc = function () {
    var messageId = that._nextId()
    if (messageId === null) {
      debug('No messageId left')
      return false
    }
    var packet = {
      cmd: 'unsubscribe',
      qos: 1,
      messageId: messageId
    }

    if (typeof topic === 'string') {
      packet.unsubscriptions = [topic]
    } else if (Array.isArray(topic)) {
      packet.unsubscriptions = topic
    }

    if (that.options.resubscribe) {
      packet.unsubscriptions.forEach(function (topic) {
        delete that._resubscribeTopics[topic]
      })
    }

    if (typeof opts === 'object' && opts.properties) {
      packet.properties = opts.properties
    }

    that.outgoing[packet.messageId] = {
      volatile: true,
      cb: callback
    }

    debug('unsubscribe: call _sendPacket')
    that._sendPacket(packet)

    return true
  }

  if (this._storeProcessing || this._storeProcessingQueue.length > 0) {
    this._storeProcessingQueue.push(
      {
        'invoke': unsubscribeProc,
        'callback': callback
      }
    )
  } else {
    unsubscribeProc()
  }

  return this
}
