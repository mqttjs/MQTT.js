import { assert } from 'chai'
import { describe, it } from 'node:test'
import { NumberAllocator } from '../../src/lib/number-allocator'

describe('NumberAllocator', () => {
	describe('alloc', () => {
		it('should allocate sequentially from min', () => {
			const a = new NumberAllocator(1, 10)
			assert.equal(a.alloc(), 1)
			assert.equal(a.alloc(), 2)
			assert.equal(a.alloc(), 3)
		})

		it('should return null when all numbers are allocated', () => {
			const a = new NumberAllocator(1, 3)
			assert.equal(a.alloc(), 1)
			assert.equal(a.alloc(), 2)
			assert.equal(a.alloc(), 3)
			assert.equal(a.alloc(), null)
		})

		it('should reuse freed numbers', () => {
			const a = new NumberAllocator(1, 5)
			a.alloc() // 1
			a.alloc() // 2
			a.alloc() // 3
			a.free(2)
			assert.equal(a.alloc(), 2)
		})

		it('should return smallest available after free', () => {
			const a = new NumberAllocator(1, 10)
			for (let i = 1; i <= 5; i++) a.alloc()
			a.free(2)
			a.free(4)
			assert.equal(a.alloc(), 2)
			assert.equal(a.alloc(), 4)
			assert.equal(a.alloc(), 6)
		})
	})

	describe('use', () => {
		it('should mark a specific number as occupied', () => {
			const a = new NumberAllocator(1, 10)
			assert.equal(a.use(5), true)
			assert.equal(a.alloc(), 1)
			assert.equal(a.use(5), false) // already occupied
		})

		it('should return false for already-used numbers', () => {
			const a = new NumberAllocator(1, 10)
			assert.equal(a.use(3), true)
			assert.equal(a.use(3), false)
		})

		it('should return false for out-of-range numbers', () => {
			const a = new NumberAllocator(1, 10)
			assert.equal(a.use(0), false)
			assert.equal(a.use(11), false)
			assert.equal(a.use(-1), false)
		})

		it('should skip used numbers in alloc', () => {
			const a = new NumberAllocator(1, 5)
			a.use(2)
			assert.equal(a.alloc(), 1)
			assert.equal(a.alloc(), 3)
		})
	})

	describe('free', () => {
		it('should make a number available again', () => {
			const a = new NumberAllocator(1, 5)
			a.alloc() // 1
			a.alloc() // 2
			a.free(1)
			assert.equal(a.alloc(), 1)
		})

		it('should be a no-op for out-of-range numbers', () => {
			const a = new NumberAllocator(1, 5)
			a.alloc() // 1
			a.free(0) // out of range, no-op
			a.free(6) // out of range, no-op
			assert.equal(a.alloc(), 2) // unaffected
		})

		it('should be idempotent (double-free is no-op)', () => {
			const a = new NumberAllocator(1, 5)
			a.alloc() // 1
			a.alloc() // 2
			a.free(1)
			a.free(1) // double-free
			assert.equal(a.alloc(), 1)
			assert.equal(a.alloc(), 3)
		})
	})

	describe('firstVacant', () => {
		it('should return the smallest vacant number', () => {
			const a = new NumberAllocator(1, 10)
			assert.equal(a.firstVacant(), 1)
			a.alloc()
			assert.equal(a.firstVacant(), 2)
		})

		it('should return null when all numbers are allocated', () => {
			const a = new NumberAllocator(1, 3)
			a.alloc()
			a.alloc()
			a.alloc()
			assert.equal(a.firstVacant(), null)
		})

		it('should not consume the number (peek only)', () => {
			const a = new NumberAllocator(1, 10)
			assert.equal(a.firstVacant(), 1)
			assert.equal(a.firstVacant(), 1) // still 1, not consumed
			assert.equal(a.alloc(), 1) // now consume it
			assert.equal(a.firstVacant(), 2)
		})

		it('should reflect freed numbers', () => {
			const a = new NumberAllocator(1, 5)
			a.alloc() // 1
			a.alloc() // 2
			a.alloc() // 3
			a.free(2)
			assert.equal(a.firstVacant(), 2)
		})

		it('should not scan a range saturated via use', () => {
			const a = new NumberAllocator(1, 3)
			for (let i = 1; i <= 3; i++) {
				assert.equal(a.use(i), true)
			}

			const used = (a as unknown as { used: Set<number> }).used
			const has = used.has.bind(used)
			let hasCalls = 0
			used.has = (num) => {
				hasCalls++
				return has(num)
			}

			assert.equal(a.firstVacant(), null)
			assert.equal(a.alloc(), null)
			assert.equal(hasCalls, 0)
		})
	})

	describe('clear', () => {
		it('should reset all numbers to vacant', () => {
			const a = new NumberAllocator(1, 5)
			a.alloc()
			a.alloc()
			a.alloc()
			a.clear()
			assert.equal(a.alloc(), 1)
			assert.equal(a.alloc(), 2)
		})
	})

	describe('edge cases', () => {
		it('should work with a single-number range', () => {
			const a = new NumberAllocator(5, 5)
			assert.equal(a.alloc(), 5)
			assert.equal(a.alloc(), null)
			a.free(5)
			assert.equal(a.alloc(), 5)
		})

		it('should work with non-1 minimum', () => {
			const a = new NumberAllocator(10, 15)
			assert.equal(a.alloc(), 10)
			assert.equal(a.alloc(), 11)
			assert.equal(a.use(9), false) // below min
			assert.equal(a.use(16), false) // above max
		})

		it('should handle full exhaustion and recovery', () => {
			const a = new NumberAllocator(1, 65535)
			for (let i = 1; i <= 65535; i++) {
				assert.equal(a.alloc(), i)
			}
			assert.equal(a.alloc(), null)
			assert.equal(a.firstVacant(), null)
			a.free(10000)
			assert.equal(a.firstVacant(), 10000)
			assert.equal(a.alloc(), 10000)
			assert.equal(a.alloc(), null)
		})
	})
})
