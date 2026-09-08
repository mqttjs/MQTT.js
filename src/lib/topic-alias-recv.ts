/**
 * Topic Alias receiving manager
 * This holds alias to topic map
 * @param {Number} [max] - topic alias maximum entries
 */
export default class TopicAliasRecv {
	private aliasToTopic: Record<number, string>

	public max: number

	public length: number

	constructor(max: number) {
		// plain object is safe here: keys are broker aliases, range-checked in put()
		this.aliasToTopic = {}
		this.max = max
		this.length = 0
	}

	/**
	 * Insert or update topic - alias entry.
	 * @param {String} [topic] - topic
	 * @param {Number} [alias] - topic alias
	 * @returns {Boolean} - if success return true otherwise false
	 */
	put(topic: string, alias: number): boolean {
		if (alias === 0 || alias > this.max) {
			return false
		}
		if (!(alias in this.aliasToTopic)) {
			this.length++
		}
		this.aliasToTopic[alias] = topic
		return true
	}

	/**
	 * Get topic by alias
	 * @param {String} [topic] - topic
	 * @returns {Number} - if mapped topic exists return topic alias, otherwise return undefined
	 */
	getTopicByAlias(alias: number): string {
		return this.aliasToTopic[alias]
	}

	/**
	 * Clear all entries
	 */
	clear() {
		this.aliasToTopic = {}
		this.length = 0
	}
}
