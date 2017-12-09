'use strict'

var mqtt = require('../lib/connect')

describe('store in mqtt', function () {
  it('should create store via mqtt', function (done) {
    done(null, new mqtt.Store())
  })
})
