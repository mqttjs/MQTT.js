const mqtt = require('../lib/connect')

describe('store in lib/connect/index.js (webpack entry point)', () => {
	it('should create store', function test(done) {
		const store = new mqtt.Store()
		store.should.be.instanceOf(mqtt.Store)
		done()
	})
})
