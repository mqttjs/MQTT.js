'use strict';

/**
 * Module dependencies
 */
import LruCache from 'lru-cache';
import { NumberAllocator } from 'number-allocator';

export class TopicAliasSend {
  aliasToTopic: LruCache<number, string>;
  topicToAlias: { [key: string]: number };
  numberAllocator: NumberAllocator;
  max: number;

  /**
   * Topic Alias sending manager
   * This holds both topic to alias and alias to topic map
   * @param {Number} [max] - topic alias maximum entries
   */
  constructor(max: number) {
    if (max <= 0) {
      throw new RangeError('max must be > 0');
    }

    this.aliasToTopic = new LruCache<number, string>({ max: max });
    this.topicToAlias = {};
    this.numberAllocator = new NumberAllocator(1, max);
    this.max = max;
  }

  public get length(): number {
    return this.aliasToTopic.size;
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
    const entry = this.aliasToTopic.get(alias);
    if (entry) {
      delete this.topicToAlias[entry];
    }
    this.aliasToTopic.set(alias, topic);
    this.topicToAlias[topic] = alias;
    this.numberAllocator.use(alias);
    return true;
  }

  /**
   * Get topic by alias
   * @param {Number} [alias] - topic alias
   * @return {String} - if mapped topic exists return topic, otherwise return undefined
   */
  public getTopicByAlias(alias: number): string | undefined {
    return this.aliasToTopic.get(alias);
  }

  /**
   * Get topic by alias
   * @param {String} [topic] - topic
   * @return {Number} - if mapped topic exists return topic alias, otherwise return undefined
   */
  public getAliasByTopic(topic: string): number | undefined {
    const alias = this.topicToAlias[topic];
    if (typeof alias !== 'undefined') {
      this.aliasToTopic.get(alias); // LRU update
    }
    return alias;
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.aliasToTopic.reset();
    this.topicToAlias = {};
    this.numberAllocator.clear();
  }

  /**
   * Get Least Recently Used (LRU) topic alias
   * @return {Number} - if vacant alias exists then return it, otherwise then return LRU alias
   */
  public getLruAlias(): number {
    const alias = this.numberAllocator.firstVacant();
    if (alias) {
      return alias;
    } else {
      return this.aliasToTopic.rkeys().next().value;
    }
  }
}
