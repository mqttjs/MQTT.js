/*global describe, it */

var assert = require('assert'),
  should = require('should'),
  util = require('util');

var make_tester = require('./tester'),
  Connection = require('../lib/connection'),
  cases = require('./parse.json');


/*
 * Helper function that actually do the testing
 */
function runTest(test, done) {
  var desc = test.description,
    expected = test.expected,
    input = new Buffer(test.fixture),
    type = this.type;
  this.uut.once(type, (function (expected) {
    return function (packet) {
      var k, e, wasError = false;
      for (k in expected) {
        if (expected.hasOwnProperty(k)) {
          packet.should.have.property(k);
          assert.deepEqual(packet[k], expected[k],
            util.format('\t\tPacket[%s]: %j\n\t\tExpected[%s]: %j',
              k, packet[k], k, expected[k]));
        }
      }
      done();
    };
  }(expected)));

  this.tester.write(input);
}


/*
 * Create a testcase 
 */
function make_parsing_suite(type, suite) {
  return function () {
    suite.forEach(function (test) {
      it("should parse '" + test.description + "'", function (done) {
        this.tester = make_tester();
        this.uut = new Connection(this.tester);
        this.type = type;
        runTest.call(this, test, done);
      });
    });
  };
}



/*
 * Generate tests from parse.json
 */
describe("Connection Parsing", function () {
  var type;
  for (type in cases) {
    if (cases.hasOwnProperty(type)) {
      describe("in case '" + type + "'",
        make_parsing_suite.call(this, type, cases[type]));
    }
  }
});

