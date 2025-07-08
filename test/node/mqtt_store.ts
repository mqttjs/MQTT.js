import { describe, it } from 'node:test'
import { Store } from '../../src'
import 'should'

describe('store in lib/connect/index.js (webpack entry point)', () => {
	it('should create store', function test(t, done) {
		const store = new Store()
		store.should.be.instanceOf(Store)
		done()
	})
})
