import { describe } from 'node:test'
import Store from '../../src/lib/store.js'
import abstractTest from './abstract_store.js'

describe('in-memory store', () => {
	abstractTest(function test(done) {
		done(null, new Store())
	})
})
