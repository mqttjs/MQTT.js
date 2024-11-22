import Store from '../../src/lib/store'
import abstractTest from './abstract_store'
import { describe } from 'node:test'

describe('in-memory store', () => {
	abstractTest(function test(done) {
		done(null, new Store())
	})
})
