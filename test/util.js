'use strict'

const Transform = require('readable-stream').Transform

module.exports.testStream = function () {
  return new Transform({
    transform (buf, enc, cb) {
      const that = this
      setImmediate(function () {
        that.push(buf)
        cb()
      })
    }
  })
}
