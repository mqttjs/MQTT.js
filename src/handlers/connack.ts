export async function handleConnAck (packet) {
  this.connackTimer = setTimeout(function () {
    debug('!!connectTimeout hit!! Calling _cleanUp with force `true`')
    that._cleanUp(true)
  }, this.options.connectTimeout)

  var options = this.options
  var version = options.protocolVersion
  var rc = version === 5 ? packet.reasonCode : packet.returnCode

  clearTimeout(this.connackTimer)

  if (packet.properties) {
    if (packet.properties.topicAliasMaximum) {
      if (!options.properties) { options.properties = {} }
      options.properties.topicAliasMaximum = packet.properties.topicAliasMaximum
    }
    if (packet.properties.serverKeepAlive && options.keepalive) {
      options.keepalive = packet.properties.serverKeepAlive
      this._shiftPingInterval()
    }
    if (packet.properties.maximumPacketSize) {
      if (!options.properties) { options.properties = {} }
      options.properties.maximumPacketSize = packet.properties.maximumPacketSize
    }
  }

  if (rc === 0) {
    this.reconnecting = false
    this._onConnect(packet)
  } else if (rc > 0) {
    var err = new Error('Connection refused: ' + errors[rc])
    err.code = rc
    this.emit('error', err)
  }
}
