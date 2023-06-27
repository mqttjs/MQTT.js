'use strict'

/**
 * DefaultMessageAllocator constructor
 * @constructor
 */
function DefaultMessageIdProvider () {
  if (!(this instanceof DefaultMessageIdProvider)) {
    return new DefaultMessageIdProvider()
  }

  /**
   * MessageIDs starting with 1
   * ensure that nextId is min. 1, see https://github.com/mqttjs/MQTT.js/issues/810
   */
  this.nextId = Math.max(1, Math.floor(Math.random() * 65535))
}

/**
 * allocate
 *
 * Get the next messageId.
 * @return unsigned int
 */
DefaultMessageIdProvider.prototype.allocate = function () {
  // id becomes current state of this.nextId and increments afterwards
  const id = this.nextId++
  // Ensure 16 bit unsigned int (max 65535, nextId got one higher)
  if (this.nextId === 65536) {
    this.nextId = 1
  }
  return id
}

/**
 * getLastAllocated
 * Get the last allocated messageId.
 * @return unsigned int
 */
DefaultMessageIdProvider.prototype.getLastAllocated = function () {
  return (this.nextId === 1) ? 65535 : (this.nextId - 1)
}

/**
 * register
 * Register messageId. If success return true, otherwise return false.
 * @param { unsigned int } - messageId to register,
 * @return boolean
 */
DefaultMessageIdProvider.prototype.register = function (messageId) {
  return true
}

/**
 * deallocate
 * Deallocate messageId.
 * @param { unsigned int } - messageId to deallocate,
 */
DefaultMessageIdProvider.prototype.deallocate = function (messageId) {
}

/**
 * clear
 * Deallocate all messageIds.
 */
DefaultMessageIdProvider.prototype.clear = function () {
}

module.exports = DefaultMessageIdProvider
