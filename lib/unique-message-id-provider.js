'use strict'

const NumberAllocator = require('number-allocator').NumberAllocator

/**
 * UniqueMessageAllocator constructor
 * @constructor
 */
function UniqueMessageIdProvider () {
  if (!(this instanceof UniqueMessageIdProvider)) {
    return new UniqueMessageIdProvider()
  }

  this.numberAllocator = new NumberAllocator(1, 65535)
}

/**
 * allocate
 *
 * Get the next messageId.
 * @return if messageId is fully allocated then return null,
 *         otherwise return the smallest usable unsigned int messageId.
 */
UniqueMessageIdProvider.prototype.allocate = function () {
  this.lastId = this.numberAllocator.alloc()
  return this.lastId
}

/**
 * getLastAllocated
 * Get the last allocated messageId.
 * @return unsigned int
 */
UniqueMessageIdProvider.prototype.getLastAllocated = function () {
  return this.lastId
}

/**
 * register
 * Register messageId. If success return true, otherwise return false.
 * @param { unsigned int } - messageId to register,
 * @return boolean
 */
UniqueMessageIdProvider.prototype.register = function (messageId) {
  return this.numberAllocator.use(messageId)
}

/**
 * deallocate
 * Deallocate messageId.
 * @param { unsigned int } - messageId to deallocate,
 */
UniqueMessageIdProvider.prototype.deallocate = function (messageId) {
  this.numberAllocator.free(messageId)
}

/**
 * clear
 * Deallocate all messageIds.
 */
UniqueMessageIdProvider.prototype.clear = function () {
  this.numberAllocator.clear()
}

module.exports = UniqueMessageIdProvider
