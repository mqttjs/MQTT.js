var Connection = require('../connection'),
	p = require('../packet');
	EventEmitter = require('events').EventEmitter;

describe('Connection', function() {
	var ee = new EventEmitter(),
		conn = new Connection(ee);
		
	beforeEach(function(done){
		conn.reset();
		done();
	})
	
	describe('#parse()', function() {
		it('should emit a connect packet', function(done) {
			var opts = {
				version: 'abcd',
				versionNum: 3,
				willTopic: 'abcd',
				willMessage: 'abcd',
				client: 'abcd',
				username: 'abcd',
				password: 'abcd',
				keepalive: 10,
				
			},
			packet = p.gen_connect(opts);

			conn.on('connect', function(pack) {
				for(var k in opts) {
					if(opts[k] !== pack[k]) {
						done('Error - fields don\'t match');
						return;
					}
				}
				done();
			});

			ee.emit('data', packet);
			
		})
	})
})
