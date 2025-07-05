import { Transform } from 'node:stream'

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
