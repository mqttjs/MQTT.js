import { describe, it } from 'node:test'
import { assert } from 'chai'
// tsconfig baseUrl would resolve plain 'esbuild' to the repo's esbuild.js
import { build } from 'esbuild/lib/main'
import { runInNewContext } from 'node:vm'
import path from 'node:path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { options, esmOptions } = require('../../esbuild.js')

const PINGREQ = [0xc0, 0]

describe('browser bundle', () => {
	it('flushes mqtt-packet writes while timers are suspended (#2053)', async () => {
		const result = await build({
			...options,
			// build the probe below in memory instead of the real entry
			entryPoints: undefined,
			outfile: undefined,
			write: false,
			globalName: 'probe',
			stdin: {
				resolveDir: path.join(__dirname, '../..'),
				contents: `
					import { writeToStream } from 'mqtt-packet'
					import { PassThrough } from 'readable-stream'
					export function ping() {
						const chunks = []
						const stream = new PassThrough()
						stream.on('data', (chunk) => chunks.push(...chunk))
						writeToStream({ cmd: 'pingreq' }, stream)
						return chunks
					}
				`,
			},
		})

		// React Native in the background: timers never fire
		let setTimeoutCalls = 0
		const context: Record<string, any> = {
			AbortController,
			AbortSignal,
			queueMicrotask,
			setTimeout: () => {
				setTimeoutCalls++
				return 0
			},
			clearTimeout: () => {},
		}
		runInNewContext(result.outputFiles[0].text, context)

		const chunks = context.probe.ping()
		await new Promise<void>((resolve) => {
			setImmediate(resolve)
		})
		// chunks lives in the vm realm; copy it so chai can compare
		assert.deepEqual(
			Array.from(chunks),
			PINGREQ,
			'packet not flushed: bundled process.nextTick is not the shim',
		)
		assert.equal(
			setTimeoutCalls,
			0,
			'bundle scheduled a timer: some process import bypassed the shim',
		)
	})

	it('exports the same names from the ESM bundle as build/index.js (#2074)', async () => {
		const esm = esmOptions()
		const { metafile } = await build({
			...esm,
			write: false,
			metafile: true,
		})

		const bundleExports = metafile.outputs[esm.outfile].exports
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const cjsExports = Object.keys(require('../../build'))
		assert.sameMembers(
			bundleExports,
			cjsExports,
			'ESM bundle exports differ from build/index.js: named imports like { connect } break',
		)
	})
})
