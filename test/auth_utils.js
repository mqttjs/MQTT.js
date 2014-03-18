var should = require('should');

var utils = require('../lib/auth_utils');


describe('Authentication Utils', function () {

  it('should extract username from a auth attribute', function(){
    var auth = 'user', opts = {};
    utils.parseAuthOptions(auth, opts);
    opts.should.have.property('username', 'user');
  });

  it('should extract username and password from a auth attribute', function(){
    var auth = 'user:pass', opts = {};
    utils.parseAuthOptions(auth, opts);
    opts.should.have.property('username', 'user');
    opts.should.have.property('password', 'pass');
  });

});
