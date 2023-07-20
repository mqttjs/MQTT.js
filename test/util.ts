import { Transform } from 'readable-stream'

const testStream = () => {
	return new Transform({
		transform(buf, enc, cb) {
			setImmediate(() => {
				this.push(buf)
				cb()
			})
		},
	})
}

export default testStream
