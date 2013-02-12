/*global describe, it */
var assert = require('assert'),
  should = require('should'),
  util = require('util');

var make_tester = require('./tester'),
  Connection = require('../lib/connection');

var cases = require('./transmit.json');


var bufferToString = function (buf) {
  var i, s = ['['];
  for (i = 0; i < buf.length - 1; i++) {
    s.push(buf[i]);
    s.push(',');
  }
  s.push(buf[i]);
  s.push(']');
  return s.join('');
};

var errString = function (fixture, packet, index) {
  var error = util.format(
    'Generated packet and fixtures differ at %d:\n\t\t\tFixture: %j\n\t\t\tPacket:  %j',
    index,
    bufferToString(fixture),
    bufferToString(packet)
  );
  return error;
};

/*
 * Test for success
 */
function testSuccess(test, index, done) {
  var desc = test.description,
    input = test.input,
    fixture = new Buffer(test.fixture),
    type = this.type,
    timeout;
  this.tester.once('data', (function (fixture, timeout) {
    return function (data, error) {
      var j;
      clearTimeout(timeout);
      for (j = 0; j < fixture.length && j < data.length; j++) {
        assert.equal(data[j], fixture[j], errString(fixture, data, j));
      }
      done();
    };
  }(fixture, timeout)));

  assert.notEqual(this.uut[type](input), false);
}


/*
 * Test for failure
 */
function testFailure(test, index, done) {
  var desc = test.description,
    input = test.input;
  assert.equal(this.uut[this.type](input),
    false,
    util.format("Connection#%s did not return false", this.type));
  done();
}



/*
 * Create a success testcase
 */
function make_transmit_success_test(type, test, index) {
  return it("should be successfull for '" + test.description + "'", function (done) {
    this.tester = make_tester();
    this.type = type;
    this.uut = new Connection(this.tester);
    testSuccess.call(this, test, index, done);
  });
}



/*
 * Create a failure testcase
 */
function make_transmit_fail_test(type, test, index) {
  it("should fail for '" + test.description + "'", function (done) {
    this.tester = make_tester();
    this.type = type;
    this.uut = new Connection(this.tester);
    testFailure.call(this, test, index, done);
  });
}


/*
 * Create the test suite
 */
function make_transmit_suite(type, successes, failures) {
  return function () {
    var i;
    for (i = 0; i < successes.length; i++) {
      make_transmit_success_test.call(this, type, successes[i], i);
    }//end for i in successes

    for (i = 0; i < failures.length; i++) {
      make_transmit_fail_test.call(this, type, failures[i], i);
    }//end for i in failures
  };
}



/*
 * Tests start here
 */
describe("Connection Transmit", function () {
  var type, successes, failures;
  for (type in cases) {
    if (cases.hasOwnProperty(type)) {
      successes = cases[type].success;
      failures = cases[type].failure;
      describe("with type '" + type + "'", make_transmit_suite(type, successes, failures));
    }
  }
});

