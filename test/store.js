const Store = require('../lib/store')
const abstractTest = require('./abstract_store')

describe('in-memory store', () => {
	abstractTest(function test(done) {
		done(null, new Store())
	})
})
