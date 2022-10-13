'use strict';

export class TopicAliasRecv {
  /**
   * Topic Alias receiving manager
   * This holds alias to topic map
   * @param {number} [max] - topic alias maximum entries
   */
  aliasToTopic: { [key: number]: string };
  max: number;

  constructor(max: number) {
    this.aliasToTopic = {};
    this.max = max;
  }

  public get length(): number {
    return Object.keys(this.aliasToTopic).length;
  }

  /**
   * Insert or update topic - alias entry.
   * @param {string} [topic] - topic
   * @param {number} [alias] - topic alias
   * @return {boolean} - if success return true otherwise false
   */
  public put(topic: string, alias: number): boolean {
    if (alias === 0 || alias > this.max) {
      return false;
    }
    this.aliasToTopic[alias] = topic;
    return true;
  }

  /**
   * Get topic by alias
   * @param {string} [topic] - topic
   * @return {number} - if mapped topic exists return topic alias, otherwise return undefined
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
