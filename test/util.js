/**
 * Requires
 */

var util = require('util')
  , Stream = require('stream');

/**
 * Export TestStream
 */

var TestStream = module.exports.TestStream = 
function TestStream() {
  if (!this instanceof TestStream) return new TestStream();

  Stream.apply(this);
};
util.inherits(TestStream, Stream);

TestStream.prototype.write = function(buffer) {
  process.nextTick(this.emit.bind(this, 'data', buffer));
};
