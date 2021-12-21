'use strict'

const Store = require('../lib/store')
const abstractTest = require('../test/abstract_store')

describe('in-memory store', function () {
  abstractTest(function (done) {
    done(null, new Store())
  })
})
