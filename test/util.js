'use strict';
/*global setImmediate:true*/
var through = require('through2'),
  setImmediate = global.setImmediate || function (callback) {
    setTimeout(callback, 0);
  };

module.exports.testStream = function () {
  return through(function (buf, enc, cb) {
    var that = this;
    setImmediate(function () {
      that.push(buf);
      cb();
    });
  });
};
