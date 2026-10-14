import { describe, it } from 'node:test'
import { assert } from 'chai'
// tsconfig baseUrl would resolve plain 'esbuild' to the repo's esbuild.js
import { build } from 'esbuild/lib/main'
import { runInNewContext } from 'node:vm'
import path from 'node:path'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { options } = require('../../esbuild.js')

describe('browser bundle', () => {
	it('flushes mqtt-packet writes while timers are suspended (#2053)', async () => {
		const result = await build({
			...options,
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
		context.self = context
		runInNewContext(result.outputFiles[0].text, context)

		const chunks = context.probe.ping()
		await new Promise<void>((resolve) => {
			setImmediate(resolve)
		})
		// chunks lives in the vm realm; copy it so chai can compare
		assert.deepEqual(Array.from(chunks), [0xc0, 0])
		assert.equal(setTimeoutCalls, 0)
	})
})
