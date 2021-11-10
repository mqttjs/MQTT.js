'use strict'

/**
 * Module dependencies
 */
import {LruMap} from 'collections/lru-map'
import {NumberAllocator} from 'number-allocator'

export class TopicAliasSend {
  max: number
  aliasToTopic: LruMap
  topicToAlias: {[topic: string]: string}
  numberAllocator: NumberAllocator
  length: number
  
  /**
   * Topic Alias sending manager
   * This holds both topic to alias and alias to topic map
   * @param {Number} [max] - topic alias maximum entries
   */
  constructor(max: number) {
    this.max = max
    
    this.aliasToTopic = new LruMap()
    this.topicToAlias = {}
    this.numberAllocator = new NumberAllocator(1, max)
    this.length = 0
  }

  /**
   * Insert or update topic - alias entry.
   * @param {String} [topic] - topic
   * @param {Number} [alias] - topic alias
   * @returns {Boolean} - if success return true otherwise false
   */
  put (topic: string | number, alias: number) {
    if (alias === 0 || alias > this.max) {
      return false
    }
    const entry = this.aliasToTopic.get(alias)
    if (entry) {
      delete this.topicToAlias[entry.topic]
    }
    this.aliasToTopic.set(alias, {'topic': topic, 'alias': alias})
    this.topicToAlias[topic] = alias
    this.numberAllocator.use(alias)
    this.length = this.aliasToTopic.length
    return true
  }

  /**
   * Get topic by alias
   * @param {Number} [alias] - topic alias
   * @returns {String} - if mapped topic exists return topic, otherwise return undefined
   */
  getTopicByAlias(alias: any) {
    const entry = this.aliasToTopic.get(alias)
    if (typeof entry === 'undefined') return entry
    return entry.topic
  }

  /**
   * Get topic by alias
   * @param {String} [topic] - topic
   * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
   */
  getAliasByTopic(topic: string | number) {
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
    return this.aliasToTopic.min().alias
  }
}






/**
 * Get topic by alias
 * @param {String} [topic] - topic
 * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
 */
TopicAliasSend.prototype.getAliasByTopic = function (topic) {
  const alias = this.topicToAlias[topic]
  if (typeof alias !== 'undefined') {
    this.aliasToTopic.get(alias) // LRU update
  }
  return alias
}

/**
 * Clear all entries
 */
TopicAliasSend.prototype.clear = function () {
  this.aliasToTopic.clear()
  this.topicToAlias = {}
  this.numberAllocator.clear()
  this.length = 0
}

/**
 * Get Least Recently Used (LRU) topic alias
 * @returns {Number} - if vacant alias exists then return it, otherwise then return LRU alias
 */
TopicAliasSend.prototype.getLruAlias = function () {
  const alias = this.numberAllocator.firstVacant()
  if (alias) return alias
  return this.aliasToTopic.min().alias
}

module.exports = TopicAliasSend
