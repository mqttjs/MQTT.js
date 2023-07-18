const Store = require('../lib/store')
const abstractTest = require('./abstract_store')

describe('in-memory store', () => {
	abstractTest((done) => {
		done(null, new Store())
	})
})
