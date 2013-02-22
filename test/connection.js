/**
 * Testing requires
 */

var should = require('should');

describe('Connection', function() {
  describe('parsing', require('./connection.parse.js'));
  describe('transmission', require('./connection.transmit.js'));
});
