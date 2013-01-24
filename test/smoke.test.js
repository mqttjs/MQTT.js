/*global describe, it */
/* 
 * Just a simple syntax test
 * if you can not require then there is something major wrong
 */
var make_tester = require('./tester');

describe("Require all modules", function () {
  it("connection", function () {
    var O = require('../lib/connection'),
      o = new O(make_tester());
  });

  it("generate", function () {
    var c = require('../lib/generate');
  });

  it("mqtt", function () {
    var c = require('../lib/mqtt');
  });

  it("parse", function () {
    var c = require('../lib/parse');
  });

  it("protocol", function () {
    var c = require('../lib/protocol');
  });

  it("index", function () {
    var o = require('../index.js');
  });
});
