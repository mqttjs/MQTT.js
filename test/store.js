'use strict'

var Store = require('../').Store
var abstractTest = require('../test/abstract_store')

describe('in-memory store', function () {
  abstractTest(function (done) {
    done(null, new Store())
  })
})
