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

	it('should forget every topic on clear', () => {
		const t = new TopicAliasSend(3)
		t.put('__proto__', 1)
		t.clear()
		assert.isUndefined(t.getAliasByTopic('__proto__'))
		assert.equal(t.length, 0)
	})
})
