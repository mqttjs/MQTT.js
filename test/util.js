const { Transform } = require('readable-stream')

module.exports.testStream = () => {
	return new Transform({
		transform(buf, enc, cb) {
			setImmediate(() => {
				this.push(buf)
				cb()
			})
		},
	})
}
