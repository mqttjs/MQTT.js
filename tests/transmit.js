var fs = require('fs'),
	assert = require('assert'),
	util = require('util'),
	EventEmitter = require('events').EventEmitter,
	Connection = require('../lib/connection');

module.exports.test = function() {
	var cases = JSON.parse(fs.readFileSync('./transmit.json', 'utf8'));

	var bufferToString = function(buf) {
		var s = ['['];
		for (var i = 0; i < buf.length - 1; i++) {
			s.push(buf[i]);
			s.push(',');
		}

		s.push(buf[i]);
		s.push(']');

		return s.join('');
	};

	var errString = function(fixture, packet, index) {
		var error = util.format(
			'\t\tGenerated packet and fixtures differ at %d:\n\t\t\tFixture: %j\n\t\t\tPacket:  %j',
			index, bufferToString(fixture), bufferToString(packet));
		return error;
	};

	var tester = new EventEmitter();

	tester.write = function(data) {
		tester.emit('data', data);
	};

	var uut = new Connection(tester);

	console.log('\n\nTesting packet transmission\n\n');

	for(var type in cases) {
		var successes = cases[type].success,
			failures = cases[type].failure;

		console.log('Testing %s packet transmission', type);

		for (var i = 0; i < successes.length; i++) {
			var test = successes[i],
				desc = test.description,
				input = test.input,
				fixture = new Buffer(test.fixture),
				timeout;

			console.log('\tTesting %s', desc);

			tester.once('data', function(fixture, timeout) {
				return function(data, error) {
					var wasError = false;
					clearTimeout(timeout);
					for (var j = 0; j < fixture.length, j < data.length; j++) {
						try {
							assert.equal(data[j], fixture[j], j);
						} catch(e) {
							console.log(errString(fixture, data, e.message));
							wasError = true;
						}
					}
					if(!wasError) console.log('\t\tTest passed');
				}
			}(fixture, timeout));

			if(uut[type](input) === false) console.log('\t\tTest failed - invalid parameters');
		}

		console.log('Testing %s invalid parameters', type);

		for (var i = 0; i < failures.length; i++) {
			var test = failures[i],
				desc = test.description,
				wasError = true,
				input = test.input;

			console.log('\tTesting %s', desc);

			try {
				assert.equal(uut[type](input), false);
			} catch(e) {
				wasError = false;
				console.log('\t\tConnection#%s did not return false', type);
			}

			if(wasError) console.log('\t\tTest passed');
		}
	}
}
