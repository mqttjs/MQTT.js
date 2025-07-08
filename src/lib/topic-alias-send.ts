/**
 * Module dependencies
 */
import { LRUCache } from 'lru-cache'
import { NumberAllocator } from 'number-allocator'

/**
 * Topic Alias sending manager
 * This holds both topic to alias and alias to topic map
 * @param {Number} [max] - topic alias maximum entries
 */
export default class TopicAliasSend {
	private aliasToTopic: LRUCache<number, string> | undefined

	private topicToAlias: Record<string, number> | undefined

	private max: number | undefined

	private numberAllocator: NumberAllocator | undefined

	public length: number | undefined

	constructor(max: number) {
		if (max > 0) {
			this.aliasToTopic = new LRUCache<number, string>({ max })
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
	put(topic: string, alias: number): boolean {
		// @ts-expect-error - this.max is possibly undefined here whilst it should be a number
		if (alias === 0 || alias > this.max) {
			return false
		}
		const entry = this.aliasToTopic?.get(alias)

		if (entry !== undefined) {
			delete this.topicToAlias?.[entry]
		}
		this.aliasToTopic?.set(alias, topic)

		// @TODO: topicToAlias should most likely not be possibly undefined
		if (this.topicToAlias?.[topic] !== undefined) {
			this.topicToAlias[topic] = alias
		}
		this.numberAllocator?.use(alias)
		this.length = this.aliasToTopic?.size
		return true
	}

	/**
	 * Get topic by alias
	 * @param {Number} [alias] - topic alias
	 * @returns {String} - if mapped topic exists return topic, otherwise return undefined
	 */
	getTopicByAlias(alias: number): string | undefined {
		return this.aliasToTopic?.get(alias)
	}

	/**
	 * Get topic by alias
	 * @param {String} [topic] - topic
	 * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
	 */
	getAliasByTopic(topic: string): number | undefined {
		const alias = this.topicToAlias?.[topic]

		if (alias !== undefined) {
			this.aliasToTopic?.get(alias) // LRU update
		}

		return alias
	}

	/**
	 * Clear all entries
	 */
	clear() {
		this.aliasToTopic?.clear()
		this.topicToAlias = {}
		this.numberAllocator?.clear()
		this.length = 0
	}

	/**
	 * Get Least Recently Used (LRU) topic alias
	 * @returns {Number} - if vacant alias exists then return it, otherwise then return LRU alias
	 */
	getLruAlias(): number {
		const alias = this.numberAllocator?.firstVacant()
		if (alias) return alias
		// get last alias (key) from LRU cache
		// @ts-expect-error - this.aliasToTopic should most likely not be possibly undefined
		return [...this.aliasToTopic.keys()][this.aliasToTopic.size - 1]
	}
}
