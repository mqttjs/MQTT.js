var EventEmitter = require('events').EventEmitter;

/*
 * Generates a mock stream object used for testing
 */
module.exports = function () {
  var tester = new EventEmitter();
  tester.write = (function (tester) {
    return function (data) {
      tester.emit('data', data);
    };
  }(tester));
  return tester;
};
