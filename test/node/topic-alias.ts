import { assert } from 'chai'
import { describe, it } from 'node:test'
import TopicAliasSend from '../../src/lib/topic-alias-send'
import TopicAliasRecv from '../../src/lib/topic-alias-recv'

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

	it('should reuse a vacant alias before recycling one', () => {
		const t = new TopicAliasSend(2)
		assert.equal(t.getLruAlias(), 1)
		t.put('test1', 1)
		assert.equal(t.getLruAlias(), 2)
		t.put('test2', 2)
		// full: the least recently used alias comes back
		assert.equal(t.getLruAlias(), 1)
		t.getAliasByTopic('test1')
		assert.equal(t.getLruAlias(), 2)
	})

	it('should forget every topic on clear', () => {
		const t = new TopicAliasSend(3)
		t.put('__proto__', 1)
		t.clear()
		assert.isUndefined(t.getAliasByTopic('__proto__'))
		assert.equal(t.length, 0)
	})
})

describe('TopicAliasRecv', () => {
	it('should count each alias once', () => {
		const t = new TopicAliasRecv(3)
		assert.equal(t.length, 0)
		t.put('test1', 1)
		t.put('test2', 2)
		assert.equal(t.length, 2)
		// re-registering an alias replaces its topic, it does not add an entry
		t.put('test3', 1)
		assert.equal(t.length, 2)
		assert.equal(t.getTopicByAlias(1), 'test3')
	})

	it('should refuse an out of range alias', () => {
		const t = new TopicAliasRecv(3)
		assert.isFalse(t.put('test1', 0))
		assert.isFalse(t.put('test1', 4))
		assert.equal(t.length, 0)
	})

	it('should reset on clear', () => {
		const t = new TopicAliasRecv(3)
		t.put('test1', 1)
		t.clear()
		assert.isUndefined(t.getTopicByAlias(1))
		assert.equal(t.length, 0)
	})
})
