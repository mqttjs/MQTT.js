'use strict';

export class TopicAliasRecv {
  /**
   * Topic Alias receiving manager
   * This holds alias to topic map
   * @param {Number} [max] - topic alias maximum entries
   */
  aliasToTopic: { [key: number]: string };
  max: number;
  length: number;

  constructor(max: number) {
    this.aliasToTopic = {};
    this.max = max;
    this.length = 0; // TODO; is this even used? If so, make it a property
  }

  /**
   * Insert or update topic - alias entry.
   * @param {String} [topic] - topic
   * @param {Number} [alias] - topic alias
   * @return {Boolean} - if success return true otherwise false
   */
  public put(topic: string, alias: number): boolean {
    if (alias === 0 || alias > this.max) {
      return false;
    }
    this.aliasToTopic[alias] = topic;
    this.length = Object.keys(this.aliasToTopic).length;
    return true;
  }

  /**
   * Get topic by alias
   * @param {String} [topic] - topic
   * @return {Number} - if mapped topic exists return topic alias, otherwise return undefined
   */
  public getTopicByAlias(alias: number): string | undefined {
    return this.aliasToTopic[alias];
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.aliasToTopic = {};
  }
}
