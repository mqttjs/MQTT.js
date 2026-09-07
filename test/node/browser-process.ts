import { describe, it, afterEach } from 'node:test'
import { PassThrough } from 'node:stream'
import { execFileSync } from 'node:child_process'
import { assert } from 'chai'
import sinon from 'sinon'
import { nextTick } from '../../scripts/browser-process'

describe('browser process.nextTick', () => {
	afterEach(() => sinon.restore())
	it('runs the callback as a microtask, not via setTimeout(0)', async () => {
		const timer = sinon.spy(globalThis, 'setTimeout')
		let ran = false
		nextTick(() => {
			ran = true
		})
		assert.equal(ran, false, 'must not run synchronously')
		await Promise.resolve()
		assert.equal(ran, true, 'must run after a microtask')
		assert.isFalse(timer.called, 'must not schedule setTimeout')
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

	it('runs nested nextTick callbacks in the same drain', async () => {
		const order: number[] = []
		nextTick(() => {
			order.push(1)
			nextTick(() => {
				order.push(2)
			})
		})
		await Promise.resolve()
		assert.deepEqual(order, [1, 2])
	})

	it('uncorks a stream without waiting for setTimeout', async () => {
		const timer = sinon.spy(globalThis, 'setTimeout')
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
		assert.isFalse(timer.called)
	})

	it('falls back to a timer when microtasks are unavailable', () => {
		sinon.stub(globalThis, 'queueMicrotask').value(undefined)
		const timer = sinon.stub(globalThis, 'setTimeout')
		let ran = false
		nextTick(() => {
			ran = true
		})
		assert.isFalse(ran)
		assert.equal(timer.callCount, 1)
		;(timer.firstCall.args[0] as () => void)()
		assert.isTrue(ran)
	})

	it('resumes remaining and future callbacks after a throwing callback', () => {
		const tasks: Array<() => void> = []
		sinon.stub(globalThis, 'queueMicrotask').callsFake((callback) => {
			tasks.push(callback)
		})
		const seen: string[] = []
		nextTick(() => {
			throw new Error('boom')
		})
		nextTick(() => {
			seen.push('queued')
		})
		assert.throws(tasks.shift(), 'boom')
		assert.lengthOf(tasks, 1)
		tasks.shift()()
		nextTick(() => {
			seen.push('future')
		})
		tasks.shift()()
		assert.deepEqual(seen, ['queued', 'future'])
	})

	it('resolves process and process/ to the microtask shim through the real build plugins', async () => {
		// Run without esbuild-register's tsconfig baseUrl hook, which shadows
		// the esbuild package with the repository's esbuild.js file.
		execFileSync(process.execPath, [
			'scripts/test-browser-process-build.js',
		])
	})
})
