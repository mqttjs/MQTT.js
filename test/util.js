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

  this.encoding = null;

  Stream.apply(this);
};
util.inherits(TestStream, Stream);

TestStream.prototype.write = function(buffer) {
  if (this.encoding) {
    buffer = buffer.toString(this.encoding);
  }
  process.nextTick(this.emit.bind(this, 'data', buffer));
};

TestStream.prototype.setEncoding = function(encoding) {
  this.encoding = encoding;
};
