import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { assert } from 'chai'
import { ensureBrowserProcessNextTick } from '../../src/lib/browser-process-compat'
import { nextTick } from '../../src/lib/browser-next-tick'

describe('legacy browser process compatibility', () => {
	it('repairs a deficient host used by process-nextick-args', async () => {
		const host: { nextTick?: unknown } = {}
		const context = { process: host, module: { exports: {} as any } }
		// Load the actual dependency before repairing the host, as connect does.
		runInNewContext(
			readFileSync(require.resolve('process-nextick-args'), 'utf8'),
			context,
		)
		assert.throws(
			() => context.module.exports.nextTick(() => undefined),
			'process.nextTick is not a function',
		)
		ensureBrowserProcessNextTick(host)
		assert.strictEqual(host.nextTick, nextTick)
		let result: unknown[] = []
		context.module.exports.nextTick(
			(...args: unknown[]) => {
				result = args
			},
			'uncork',
			42,
		)
		assert.deepEqual(result, [])
		await Promise.resolve()
		assert.deepEqual(result, ['uncork', 42])
	})

	it('does not write to an already valid read-only host', () => {
		const host = Object.freeze({ nextTick })
		assert.doesNotThrow(() => ensureBrowserProcessNextTick(host))
		assert.strictEqual(host.nextTick, nextTick)
	})

	it('explains how to use a deficient read-only host', () => {
		assert.throws(
			() => ensureBrowserProcessNextTick(Object.freeze({})),
			'use mqtt/dist/mqtt.esm instead of the unbundled entry',
		)
	})

	it('preserves the native Node scheduler', () => {
		const nativeNextTick = process.nextTick
		ensureBrowserProcessNextTick(process)
		assert.strictEqual(process.nextTick, nativeNextTick)
	})
})
