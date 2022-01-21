const logger = require('pino')() 

const maxDefault = 10

export class TopicAliasRecv {
  max: number
  aliasToTopic: {[alias: string]: string}
  length?: number

  /**
   * Topic Alias receiving manager
   * This holds alias to topic map
   * @param {Number} [max] - topic alias maximum entries
   */
  constructor(max?: number) {
    if (max) {
      if (max > 0 && max > 0xffff) {
        throw new Error('topicAliasMaximum is out of range')
      }
    }

    this.max = max || maxDefault
    this.aliasToTopic = {}
  }

  /**
   * Insert or update topic - alias entry.
   * @param {String} [topic] - topic
   * @param {Number} [alias] - topic alias
   * @returns {Boolean} - if success return true otherwise false
   */
  put(topic: string, alias: number): boolean {
    logger(`put topic ${topic} in alias ${alias}`)
    if (alias === 0 || alias > this.max) {
      return false
    }
    this.aliasToTopic[alias] = topic
    this.length = Object.keys(this.aliasToTopic).length
    return true
  }

  /**
   * Get topic by alias
   * @param {String} [topic] - topic
   * @returns { Number} - if mapped topic exists return topic alias, otherwise return undefined
   */
  getTopicByAlias(alias: string | number): string | undefined {
    return this.aliasToTopic[alias]

  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.aliasToTopic = {}
  }
}