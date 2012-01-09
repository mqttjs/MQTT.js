var packet = require('../packet'),
	should = require('should');

describe('packet', function() {
	describe('#gen_length()', function() {
		it('256 MB should equal the fixture [255, 255, 255, 127]', function(){
			var fixture = [255, 255, 255, 127],
				generated = packet.priv.gen_length(256 * 1024 * 1024 - 1);
			
			fixture.should.eql(generated);
		})
		it('should return null if not a number or less than 0', function() {
			should.not.exist(packet.priv.gen_length([]));
			should.not.exist(packet.priv.gen_length({}));
			should.not.exist(packet.priv.gen_length(""));
			should.not.exist(packet.priv.gen_length(/ /));
			should.not.exist(packet.priv.gen_length(-1));
		})
	})
	
	describe('#gen_number', function() {
		it('0x5FF5 should equal the fixture [95, 245])', function() {
			var fixture = [95, 245],
				generated = packet.priv.gen_number(0x5FF5);
			
			fixture.should.eql(generated);
		})
	})
	
	describe('#gen_string', function() {
		it('ABCD should equal the fixture [0, 4, 65, 66, 67, 68])', function() {
			var fixture = [0, 4, 65, 66, 67, 68],
				generated = packet.priv.gen_string('ABCD');
				
			fixture.should.eql(generated);
		})
	})
	
	describe('#gen_connect', function() {
		it('should match the fixture', function() {
			var fixture = [0x10, 0, 0x00, 0x04, 0x41, 0x42, 0x43, 0x44, 3, 0xFE, 0x00, 0x0A, 0x00, 0x05, 0x41, 0x42, 0x43, 0x44, 0x45,
						   0x00, 0x02, 0x46, 0x47, 0x00, 0x03, 0x48, 0x49, 0x4A, 0x00, 0x03, 0x4B, 0x4C, 0x4D, 0x00, 0x02, 0x4E, 0x4F];
			var opts = {
					version: 'ABCD',
					versionNum: 3,
					clean: true,
					willRetain: true,
					willQos: 3,
					keepalive: 10,
					client: 'ABCDE',
					willTopic: 'FG',
					willMessage: 'HIJ',
					username: 'KLM',
					password: 'NO'
				};
				
			var generated = packet.gen_connect(opts);
			
			console.dir(generated);
			fixture[1] = fixture.length - 2;
			new Buffer(fixture).should.eql(generated);
				
			
		})
	})
})