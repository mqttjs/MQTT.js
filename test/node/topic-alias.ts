import { assert } from 'chai'
import { describe, it } from 'node:test'
import TopicAliasSend from '../../src/lib/topic-alias-send'

describe('TopicAliasSend', () => {
	it('should not report an alias for a topic it never registered', () => {
		const t = new TopicAliasSend(3)
		assert.isUndefined(t.getAliasByTopic('test1'))
		// topics named after Object.prototype members used to be inherited
		assert.isUndefined(t.getAliasByTopic('constructor'))
		assert.isUndefined(t.getAliasByTopic('toString'))
		assert.isUndefined(t.getAliasByTopic('__proto__'))
	})

	it('should register a topic named __proto__', () => {
		const t = new TopicAliasSend(3)
		assert.isTrue(t.put('__proto__', 1))
		assert.equal(t.getAliasByTopic('__proto__'), 1)
		assert.equal(t.getTopicByAlias(1), '__proto__')
	})

	it('should drop the previous topic when an alias is reused', () => {
		const t = new TopicAliasSend(2)
		t.put('__proto__', 1)
		t.put('test2', 2)
		assert.equal(t.length, 2)
		// alias 1 now belongs to test3, so __proto__ must no longer resolve
		assert.isTrue(t.put('test3', 1))
		assert.isUndefined(t.getAliasByTopic('__proto__'))
		assert.equal(t.getAliasByTopic('test3'), 1)
		assert.equal(t.length, 2)
	})
})
