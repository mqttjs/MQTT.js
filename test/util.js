'use strict'

var Transform = require('readable-stream').Transform

module.exports.testStream = function () {
  return new Transform({
    transform (buf, enc, cb) {
      var that = this
      setImmediate(function () {
        that.push(buf)
        cb()
      })
    }
  })
}
