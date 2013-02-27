var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  assert = require('assert');

/*
 * Generates a mock stream object used for testing
 */
var Tester = function () {
  this.open = true;
  EventEmitter.call(this);
};

util.inherits(Tester, EventEmitter);

Tester.prototype.write = function (data) {
  assert.ok(this.open, "Not allowed to write, stream is closed");
  this.emit('data', data);
};

Tester.prototype.end = function () {
  this.open = false;
};

/*
 * used to fake events like close and error in tests
 */
Tester.prototype.do_emit = function (evt, data) {
  this.emit(evt, data);
};

module.exports = function () {
  return new Tester();
};

