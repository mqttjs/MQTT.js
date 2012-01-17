var fs = require('fs'),
	assert = require('assert'),
	util = require('util'),
	EventEmitter = require('events').EventEmitter,
	Connection = require('../lib/connection');

var test = module.exports.test = function() {

	var cases = JSON.parse(fs.readFileSync('./parse.json', 'utf8'));

	var tester = new EventEmitter();

	tester.write = function(tester) {
		return function(data) {
			tester.emit('data', data);
		}
	}(tester);

	console.log('\n\nTesting packet parsing\n\n');

	var uut = new Connection(tester);

	for(type in cases) {
		var suite = cases[type];

		console.log('Testing %s packet parsing', type);

		for (var i = 0; i < suite.length; i++) {
			var test = suite[i],
				desc = test.description,
				expected = test.expected,
				input = new Buffer(test.fixture);

			console.log('\tTesting %s', desc);

			uut.once(type, function(expected) {
				return function(packet) {
					var wasError = false;

					for (var k in expected) {
						try {
							assert.ok(k in packet, {k: k});
							assert.deepEqual(packet[k], expected[k], {k: k, ev: expected[k],
										 av: packet[k]});
						} catch(e) {
							var e = e.message;
							wasError = true;
							if ('ev' in e) {
								console.log('\t\tPacket[%s]: %j\n\t\tExpected[%s]: %j',
											e.k, e.av, e.k, e.ev);
							} else if('k' in e) {
								console.log('\t\tKey %s not present in parsed packet', e.k);
							}
						}
					}

					if (!wasError) console.log('\t\tTest passed') ;

				}
			}(expected));

			tester.write(input);
		}
	}
}
