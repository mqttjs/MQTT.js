'use strict'

/**
 * Module dependencies
 */
const LRUCache = require('lru-cache')
const NumberAllocator = require('number-allocator').NumberAllocator

/**
 * Topic Alias sending manager
 * This holds both topic to alias and alias to topic map
 * @param {Number} [max] - topic alias maximum entries
 */
class TopicAliasSend {

  constructor(max) {
    if (max > 0) {
      this.aliasToTopic = new LRUCache({ max })
      this.topicToAlias = {}
      this.numberAllocator = new NumberAllocator(1, max)
      this.max = max
      this.length = 0
    }
  }
  /**
   * Insert or update topic - alias entry.
   * @param {String} [topic] - topic
   * @param {Number} [alias] - topic alias
   * @returns {Boolean} - if success return true otherwise false
   */
  put(topic, alias) {
    if (alias === 0 || alias > this.max) {
      return false
    }
    const entry = this.aliasToTopic.get(alias)
    if (entry) {
      delete this.topicToAlias[entry]
    }
    this.aliasToTopic.set(alias, topic)
    this.topicToAlias[topic] = alias
    this.numberAllocator.use(alias)
    this.length = this.aliasToTopic.size
    return true
  }
  /**
   * Get topic by alias
   * @param {Number} [alias] - topic alias
   * @returns {String} - if mapped topic exists return topic, otherwise return undefined
   */
  getTopicByAlias(alias) {
    return this.aliasToTopic.get(alias)
  }
  /**
   * Get topic by alias
   * @param {String} [topic] - topic
   * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
   */
  getAliasByTopic(topic) {
    const alias = this.topicToAlias[topic]
    if (typeof alias !== 'undefined') {
      this.aliasToTopic.get(alias) // LRU update
    }
    return alias
  }
  /**
   * Clear all entries
   */
  clear() {
    this.aliasToTopic.clear()
    this.topicToAlias = {}
    this.numberAllocator.clear()
    this.length = 0
  }
  /**
   * Get Least Recently Used (LRU) topic alias
   * @returns {Number} - if vacant alias exists then return it, otherwise then return LRU alias
   */
  getLruAlias() {
    const alias = this.numberAllocator.firstVacant()
    if (alias) return alias
    // get last alias (key) from LRU cache
    return [...this.aliasToTopic.keys()][this.aliasToTopic.size - 1]
  }
}

module.exports = TopicAliasSend
