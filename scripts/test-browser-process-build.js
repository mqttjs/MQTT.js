const assert = require('node:assert/strict')
const { runInNewContext } = require('node:vm')
const { options, buildWithProcessCheck } = require('../esbuild.js')

async function test() {
    const result = await buildWithProcessCheck({
        ...options, entryPoints: undefined, outfile: undefined, write: false,
        globalName: 'probe',
        stdin: {
            contents: 'import {nextTick as a} from "process"; import {nextTick as b} from "process/"; export {a,b}',
            resolveDir: process.cwd(),
        },
    })
    const tasks = []
    const context = { queueMicrotask: callback => tasks.push(callback) }
    runInNewContext(result.outputFiles[0].text, context)
    const seen = []
    context.probe.a(() => seen.push(1))
    context.probe.b(() => seen.push(2))
    assert.equal(tasks.length, 1)
    tasks.shift()()
    assert.deepEqual(seen, [1, 2])
}
test().catch(error => { console.error(error); process.exitCode = 1 })
