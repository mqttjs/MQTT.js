/**
 * Testing requires
 */
var should = require('should')
  , stream = require('./util').testStream;

/**
 * Units under test
 */
var Connection = require('../lib/connection');


describe('Connection', function() {

  beforeEach(function () {
    var that = this;
    this.stream = stream();
    this.conn = new Connection(this.stream);
  });

  describe('parsing', require('./connection.parse.js'));
  describe('transmission', require('./connection.transmit.js'));
});
