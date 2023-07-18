const { Transform } = require('readable-stream')

module.exports.testStream = () => {
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
