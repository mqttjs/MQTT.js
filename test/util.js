const { Transform } = require('readable-stream')

module.exports.testStream = function () {
	return new Transform({
		transform(buf, enc, cb) {
			const that = this
			setImmediate(() => {
				that.push(buf)
				cb()
			})
		},
	})
}
