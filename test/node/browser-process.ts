import { describe, it, afterEach } from 'node:test'
import { PassThrough } from 'node:stream'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { assert } from 'chai'
import sinon from 'sinon'
import browserProcess, { nextTick } from '../../src/lib/browser-process'
import baseProcess from 'process/browser.js'
import { nextTick as publicNextTick } from '../../src/lib/shared'

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

	it('drains a bulk queue without removing the front of the array', () => {
		const tasks: Array<() => void> = []
		sinon.stub(globalThis, 'queueMicrotask').callsFake((callback) => {
			tasks.push(callback)
		})
		sinon.stub(globalThis, 'setTimeout').callsFake(((
			callback: () => void,
		) => {
			tasks.push(callback)
		}) as any)
		let seen = 0
		for (let i = 0; i < 10000; i++) {
			nextTick(() => {
				assert.equal(seen++, i)
			})
		}
		assert.lengthOf(tasks, 1)
		const shift = sinon.spy(Array.prototype, 'shift')
		const slice = sinon.spy(Array.prototype, 'slice')
		try {
			for (let i = 0; i < tasks.length; i++) tasks[i]()
		} finally {
			shift.restore()
			slice.restore()
		}
		assert.equal(seen, 10000)
		assert.isFalse(shift.called)
		assert.isFalse(
			slice.called,
			'yields must not repeatedly copy the backlog',
		)
	})

	it('preserves the native Node scheduler in the public API', () => {
		assert.strictEqual(publicNextTick, process.nextTick)
	})

	it('preserves the upstream process surface without mutating its scheduler', () => {
		for (const key of Object.keys(baseProcess)) {
			if (key !== 'nextTick')
				assert.strictEqual(browserProcess[key], baseProcess[key])
		}
		assert.strictEqual(browserProcess.nextTick, nextTick)
		assert.notStrictEqual(baseProcess.nextTick, nextTick)
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

	it('yields a recursive queue to timers without losing callback order', () => {
		const microtasks: Array<() => void> = []
		const timers: Array<() => void> = []
		sinon
			.stub(globalThis, 'queueMicrotask')
			.callsFake((task) => microtasks.push(task))
		sinon.stub(globalThis, 'setTimeout').callsFake(((task: () => void) => {
			timers.push(task)
		}) as any)
		let seen = 0
		const recurse = () => {
			seen++
			if (seen < 10000) nextTick(recurse)
		}
		nextTick(recurse)
		microtasks[0]()
		const yielded = seen < 10000
		for (let i = 0; i < timers.length; i++) timers[i]()
		assert.equal(seen, 10000)
		assert.isTrue(yielded, 'recursive ticks must yield to the task queue')
		assert.isNotEmpty(timers)
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

	it('keeps FIFO ordering when more ticks arrive during a timer yield', () => {
		const microtasks: Array<() => void> = []
		const timers: Array<() => void> = []
		sinon
			.stub(globalThis, 'queueMicrotask')
			.callsFake((task) => microtasks.push(task))
		sinon.stub(globalThis, 'setTimeout').callsFake(((task: () => void) => {
			timers.push(task)
		}) as any)
		const seen: number[] = []
		for (let i = 0; i < 2048; i++) nextTick(() => seen.push(i))
		microtasks[0]()
		nextTick(() => seen.push(2048))
		assert.lengthOf(
			microtasks,
			1,
			'a yielded queue must not schedule a second drain',
		)
		for (let i = 0; i < timers.length; i++) timers[i]()
		assert.deepEqual(
			seen,
			Array.from({ length: 2049 }, (_, i) => i),
		)
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

	it('keeps older callbacks ahead of nested work after a throw', () => {
		const tasks: Array<() => void> = []
		sinon.stub(globalThis, 'queueMicrotask').callsFake((callback) => {
			tasks.push(callback)
		})
		const seen: string[] = []
		nextTick(() => {
			nextTick(() => seen.push('nested'))
			throw new Error('boom')
		})
		nextTick(() => seen.push('older'))
		assert.throws(tasks.shift(), 'boom')
		assert.lengthOf(tasks, 1)
		tasks.shift()()
		assert.deepEqual(seen, ['older', 'nested'])
		assert.isEmpty(tasks)
	})

	it('recovers the timer fallback queue after a throw', () => {
		sinon.stub(globalThis, 'queueMicrotask').value(undefined)
		const timer = sinon.stub(globalThis, 'setTimeout')
		let ran = false
		nextTick(() => {
			throw new Error('boom')
		})
		nextTick(() => {
			ran = true
		})
		assert.throws(timer.firstCall.args[0] as () => void, 'boom')
		assert.equal(timer.callCount, 2)
		;(timer.secondCall.args[0] as () => void)()
		assert.isTrue(ran)
	})

	it('ignores diagnostic failures while preserving callback errors and queued work', () => {
		// A fresh process resets one-time diagnostic flags without test-only hooks.
		execFileSync(process.execPath, [
			'-r',
			require.resolve('esbuild-register'),
			'-e',
			`
			const assert = require('node:assert/strict')
			require('debug')
			require.cache[require.resolve('debug')].exports = () => {
				throw new Error('logger failure')
			}
			const { nextTick } = require(${JSON.stringify(resolve(__dirname, '../../src/lib/browser-next-tick.ts'))})
			const tasks = []
			global.queueMicrotask = undefined
			global.setTimeout = (task) => tasks.push(task)
			const original = new Error('callback failure')
			let ran = false
			nextTick(() => { throw original })
			nextTick(() => { ran = true })
			assert.throws(tasks.shift(), (error) => error === original)
			tasks.shift()()
			assert.equal(ran, true)
			assert.equal(tasks.length, 0)
			`,
		])
	})

	it('resolves process aliases through the real build plugins from another cwd', () => {
		// Run without esbuild-register's tsconfig baseUrl hook, which shadows
		// the esbuild package with the repository's esbuild.js file.
		execFileSync(
			process.execPath,
			[resolve(__dirname, '../../scripts/test-browser-process-build.js')],
			{ cwd: tmpdir() },
		)
	})
})
