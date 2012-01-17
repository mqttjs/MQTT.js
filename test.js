process.chdir('./tests');
var tests = ['./tests/parse.js', './tests/transmit.js'];

for (var i = 0; i < tests.length; i++) {
	require(tests[i]).test();
}

