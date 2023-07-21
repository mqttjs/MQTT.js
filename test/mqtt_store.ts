import Store from '../src/lib/store'

describe('store in lib/connect/index.js (webpack entry point)', () => {
	it('should create store', function test(done) {
		const store = new Store()
		store.should.be.instanceOf(Store)
		done()
	})
})
