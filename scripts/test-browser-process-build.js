const assert = require('node:assert/strict')
const { runInNewContext } = require('node:vm')
const path = require('node:path')
const { build } = require('esbuild')
const { options, buildWithProcessCheck } = require('../esbuild.js')
const root = path.resolve(__dirname, '..')

async function test() {
    const result = await buildWithProcessCheck({
        ...options, absWorkingDir: root, entryPoints: undefined, outfile: undefined, write: false,
        globalName: 'probe',
        stdin: {
            contents: 'import {nextTick as a} from "process"; import {nextTick as b} from "process/"; import {nextTick as c} from "process/browser"; import {nextTick as d} from "process/browser.js"; export {a,b,c,d}',
            resolveDir: root,
        },
    })
    const tasks = []
    const context = { queueMicrotask: callback => tasks.push(callback) }
    runInNewContext(result.outputFiles[0].text, context)
    const seen = []
    context.probe.a(() => seen.push(1))
    context.probe.b(() => seen.push(2))
    context.probe.c(() => seen.push(3))
    context.probe.d(() => seen.push(4))
    assert.equal(tasks.length, 1)
    tasks.shift()()
    assert.deepEqual(seen, [1, 2, 3, 4])
    const shared = await build({
        absWorkingDir: root, entryPoints: ['src/lib/shared.ts'], bundle: true, write: false,
        platform: 'browser', format: 'iife', globalName: 'shared',
    })
    for (const microtasksAvailable of [true, false]) {
      for (const processAvailable of [true, false]) {
        const jobs = []
        const timers = []
        const fallbackContext = {
            ...(processAvailable ? { process: {} } : {}),
            setTimeout: callback => timers.push(callback),
            ...(microtasksAvailable ? { queueMicrotask: callback => jobs.push(callback) } : {}),
        }
        runInNewContext(shared.outputFiles[0].text, fallbackContext)
        let ran = false
        fallbackContext.shared.nextTick(() => { ran = true })
        assert.equal(ran, false)
        assert.equal(jobs.length, microtasksAvailable ? 1 : 0)
        assert.equal(timers.length, microtasksAvailable ? 0 : 1)
        ;(microtasksAvailable ? jobs : timers).shift()()
        assert.equal(ran, true)
        if (processAvailable) assert.equal(fallbackContext.process.nextTick, undefined)
      }
    }

}
test().catch(error => { console.error(error); process.exitCode = 1 })
