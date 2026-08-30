import { describe, it } from 'node:test'
import { PassThrough } from 'node:stream'
import { assert } from 'chai'
import { nextTick } from '../../src/lib/browser-process'

describe('browser process.nextTick', () => {
	it('runs the callback as a microtask, not via setTimeout(0)', async () => {
		const origSetTimeout = setTimeout
		let timeoutUsed = false
		global.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
			timeoutUsed = true
			return origSetTimeout(...args)
		}) as typeof setTimeout

		try {
			let ran = false
			nextTick(() => {
				ran = true
			})
			assert.equal(ran, false, 'must not run synchronously')
			await Promise.resolve()
			assert.equal(ran, true, 'must run after a microtask')
			assert.equal(timeoutUsed, false, 'must not schedule setTimeout')
		} finally {
			global.setTimeout = origSetTimeout
		}
	})

	it('forwards extra arguments', async () => {
		let received: unknown[] = []
		nextTick(
			(a: number, b: string) => {
				received = [a, b]
			},
			1,
			'pong',
		)
		await Promise.resolve()
		assert.deepEqual(received, [1, 'pong'])
	})

	it('throws when the callback is not a function', () => {
		assert.throws(
			() => {
				nextTick(null as unknown as () => void)
			},
			TypeError,
			'"callback" argument must be a function',
		)
	})

	it('uncorks a stream without waiting for setTimeout', async () => {
		const origSetTimeout = setTimeout
		let timeoutUsed = false
		global.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
			timeoutUsed = true
			return origSetTimeout(...args)
		}) as typeof setTimeout

		try {
			const stream = new PassThrough()
			const chunks: Buffer[] = []
			stream.on('data', (chunk) => {
				chunks.push(chunk)
			})
			stream.cork()
			stream.write('ping')
			assert.equal(chunks.length, 0, 'corked writes stay buffered')

			nextTick(() => {
				stream.uncork()
			})
			await Promise.resolve()

			assert.equal(Buffer.concat(chunks).toString(), 'ping')
			assert.equal(timeoutUsed, false)
		} finally {
			global.setTimeout = origSetTimeout
		}
	})
})
