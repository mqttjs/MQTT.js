
/**
 * subscribe - subscribe to <topic>
 *
 * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
 * @param {Object} [opts] - optional subscription options, includes:
 *    {Number} qos - subscribe qos level
 * @param {Function} [callback] - function(err, granted){} where:
 *    {Error} err - subscription error (none at the moment!)
 *    {Array} granted - array of {topic: 't', qos: 0}
 * @returns {MqttClient} this - for chaining
 * @api public
 * @example client.subscribe('topic');
 * @example client.subscribe('topic', {qos: 1});
 * @example client.subscribe({'topic': {qos: 0}, 'topic2': {qos: 1}}, console.log);
 * @example client.subscribe('topic', console.log);
 */
export async function handleSub () {
    var that = this
    var args = new Array(arguments.length)
    for (var i = 0; i < arguments.length; i++) {
      args[i] = arguments[i]
    }
    var subs = []
    var obj = args.shift()
    var resubscribe = obj.resubscribe
    var callback = args.pop() || nop
    var opts = args.pop()
    var version = this.options.protocolVersion
  
    delete obj.resubscribe
  
    if (typeof obj === 'string') {
      obj = [obj]
    }
  
    if (typeof callback !== 'function') {
      opts = callback
      callback = nop
    }
  
    var invalidTopic = validations.validateTopics(obj)
    if (invalidTopic !== null) {
      setImmediate(callback, new Error('Invalid topic ' + invalidTopic))
      return this
    }
  
    if (this._checkDisconnecting(callback)) {
      debug('subscribe: discconecting true')
      return this
    }
  
    var defaultOpts = {
      qos: 0
    }
    if (version === 5) {
      defaultOpts.nl = false
      defaultOpts.rap = false
      defaultOpts.rh = 0
    }
    opts = xtend(defaultOpts, opts)
  
    if (Array.isArray(obj)) {
      obj.forEach(function (topic) {
        debug('subscribe: array topic %s', topic)
        if (!that._resubscribeTopics.hasOwnProperty(topic) ||
          that._resubscribeTopics[topic].qos < opts.qos ||
            resubscribe) {
          var currentOpts = {
            topic: topic,
            qos: opts.qos
          }
          if (version === 5) {
            currentOpts.nl = opts.nl
            currentOpts.rap = opts.rap
            currentOpts.rh = opts.rh
            currentOpts.properties = opts.properties
          }
          debug('subscribe: pushing topic `%s` and qos `%s` to subs list', currentOpts.topic, currentOpts.qos)
          subs.push(currentOpts)
        }
      })
    } else {
      Object
        .keys(obj)
        .forEach(function (k) {
          debug('subscribe: object topic %s', k)
          if (!that._resubscribeTopics.hasOwnProperty(k) ||
            that._resubscribeTopics[k].qos < obj[k].qos ||
              resubscribe) {
            var currentOpts = {
              topic: k,
              qos: obj[k].qos
            }
            if (version === 5) {
              currentOpts.nl = obj[k].nl
              currentOpts.rap = obj[k].rap
              currentOpts.rh = obj[k].rh
              currentOpts.properties = opts.properties
            }
            debug('subscribe: pushing `%s` to subs list', currentOpts)
            subs.push(currentOpts)
          }
        })
    }
  
    if (!subs.length) {
      callback(null, [])
      return this
    }
  
    var subscribeProc = function () {
      var messageId = that._nextId()
      if (messageId === null) {
        debug('No messageId left')
        return false
      }
  
      var packet = {
        cmd: 'subscribe',
        subscriptions: subs,
        qos: 1,
        retain: false,
        dup: false,
        messageId: messageId
      }
  
      if (opts.properties) {
        packet.properties = opts.properties
      }
  
      // subscriptions to resubscribe to in case of disconnect
      if (that.options.resubscribe) {
        debug('subscribe :: resubscribe true')
        var topics = []
        subs.forEach(function (sub) {
          if (that.options.reconnectPeriod > 0) {
            var topic = { qos: sub.qos }
            if (version === 5) {
              topic.nl = sub.nl || false
              topic.rap = sub.rap || false
              topic.rh = sub.rh || 0
              topic.properties = sub.properties
            }
            that._resubscribeTopics[sub.topic] = topic
            topics.push(sub.topic)
          }
        })
        that.messageIdToTopic[packet.messageId] = topics
      }
  
      that.outgoing[packet.messageId] = {
        volatile: true,
        cb: function (err, packet) {
          if (!err) {
            var granted = packet.granted
            for (var i = 0; i < granted.length; i += 1) {
              subs[i].qos = granted[i]
            }
          }
  
          callback(err, subs)
        }
      }
      debug('subscribe :: call _sendPacket')
      that._sendPacket(packet)
      return true
    }
  
    if (this._storeProcessing || this._storeProcessingQueue.length > 0) {
      this._storeProcessingQueue.push(
        {
          'invoke': subscribeProc,
          'callback': callback
        }
      )
    } else {
      subscribeProc()
    }
  
    return this
}
