import { assert } from 'chai'
import DefaultMessageIdProvider from '../src/lib/default-message-id-provider'
import UniqueMessageIdProvider from '../src/lib/unique-message-id-provider'
import { describe, it } from 'node:test'

describe('message id provider', () => {
	describe('default', () => {
		it('should return 1 once the internal counter reached limit', (t, done) => {
			const provider = new DefaultMessageIdProvider()
			provider['nextId'] = 65535

			assert.equal(provider.allocate(), 65535)
			assert.equal(provider.allocate(), 1)
		})

		it('should return 65535 for last message id once the internal counter reached limit', (t, done) => {
			const provider = new DefaultMessageIdProvider()
			provider['nextId'] = 65535

			assert.equal(provider.allocate(), 65535)
			assert.equal(provider.getLastAllocated(), 65535)
			assert.equal(provider.allocate(), 1)
			assert.equal(provider.getLastAllocated(), 1)
		})
		it('should return true when register with non allocated messageId', (t, done) => {
			const provider = new DefaultMessageIdProvider()
			assert.equal(provider.register(10), true)
		})
	})
	describe('unique', () => {
		it('should return 1, 2, 3..,  when allocate', (t, done) => {
			const provider = new UniqueMessageIdProvider()
			assert.equal(provider.allocate(), 1)
			assert.equal(provider.allocate(), 2)
			assert.equal(provider.allocate(), 3)
		})
		it('should skip registerd messageId', (t, done) => {
			const provider = new UniqueMessageIdProvider()
			assert.equal(provider.register(2), true)
			assert.equal(provider.allocate(), 1)
			assert.equal(provider.allocate(), 3)
		})
		it('should return false register allocated  messageId', (t, done) => {
			const provider = new UniqueMessageIdProvider()
			assert.equal(provider.allocate(), 1)
			assert.equal(provider.register(1), false)
			assert.equal(provider.register(5), true)
			assert.equal(provider.register(5), false)
		})
		it('should retrun correct last messageId', (t, done) => {
			const provider = new UniqueMessageIdProvider()
			assert.equal(provider.allocate(), 1)
			assert.equal(provider.getLastAllocated(), 1)
			assert.equal(provider.register(2), true)
			assert.equal(provider.getLastAllocated(), 1)
			assert.equal(provider.allocate(), 3)
			assert.equal(provider.getLastAllocated(), 3)
		})
		it('should be reusable deallocated messageId', (t, done) => {
			const provider = new UniqueMessageIdProvider()
			assert.equal(provider.allocate(), 1)
			assert.equal(provider.allocate(), 2)
			assert.equal(provider.allocate(), 3)
			provider.deallocate(2)
			assert.equal(provider.allocate(), 2)
		})
		it('should allocate all messageId and then return null', (t, done) => {
			const provider = new UniqueMessageIdProvider()
			for (let i = 1; i <= 65535; i++) {
				assert.equal(provider.allocate(), i)
			}
			assert.equal(provider.allocate(), null)
			provider.deallocate(10000)
			assert.equal(provider.allocate(), 10000)
			assert.equal(provider.allocate(), null)
		})
		it('should all messageId reallocatable after clear', (t, done) => {
			const provider = new UniqueMessageIdProvider()
			for (let i = 1; i <= 65535; i++) {
				assert.equal(provider.allocate(), i)
			}
			assert.equal(provider.allocate(), null)
			provider.clear()
			for (let i = 1; i <= 65535; i++) {
				assert.equal(provider.allocate(), i)
			}
			assert.equal(provider.allocate(), null)
		})
	})
})
