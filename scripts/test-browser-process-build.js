const assert = require('node:assert/strict')
const { test } = require('node:test')
const { readFileSync } = require('node:fs')
const { runInNewContext } = require('node:vm')
const path = require('node:path')
const { transform } = require('esbuild')
const { options, buildWithProcessCheck } = require('../esbuild.js')
const root = path.resolve(__dirname, '..')

function probe(contents, overrides = {}) {
    return buildWithProcessCheck({
        ...options, absWorkingDir: root, entryPoints: undefined, outfile: undefined, write: false,
        globalName: 'probe', stdin: { contents, resolveDir: root }, ...overrides,
    })
}

function environment(host, microtasks = true) {
    const jobs = [], timers = []
    const context = {
        console, AbortController, AbortSignal,
        navigator: { product: 'ReactNative', userAgent: 'Hermes', language: 'en' },
        setTimeout: callback => { timers.push(callback); return timers.length },
        clearTimeout() {}, setInterval() { return 1 }, clearInterval() {},
        ...(microtasks ? { queueMicrotask: callback => jobs.push(callback) } : {}),
        ...(host === undefined ? {} : { process: host }),
    }
    context.self = context
    return { context, jobs, timers }
}

test('aliases, injected global, public API and packet writes share the scheduler', async () => {
    const result = await probe(`
        import {nextTick as a} from 'process';
        import {nextTick as b} from 'process/';
        import {nextTick as c} from 'process/browser';
        import {nextTick as d} from 'process/browser.js';
        import {nextTick as e} from './src/lib/shared';
        import {writeToStream} from 'mqtt-packet';
        import {PassThrough} from 'readable-stream';
        export {a,b,c,d,e}; export const globalTick = process.nextTick;
        export function packet() {
            const stream = new PassThrough(); const chunks = [];
            stream.on('data', chunk => chunks.push(...chunk));
            writeToStream({cmd:'pingreq'}, stream);
            return chunks;
        }
    `)
    for (const host of [undefined, {}, Object.freeze({}), Object.freeze({ nextTick() { throw Error('host timer used') } })]) {
        for (const microtasks of [true, false]) {
            const { context, jobs, timers } = environment(host, microtasks)
            runInNewContext(result.outputFiles[0].text, context)
            const api = context.probe
            for (const name of ['b', 'c', 'd', 'e', 'globalTick']) assert.equal(api.a, api[name])
            const seen = []
            api.a(() => seen.push(1)); api.e(() => seen.push(2))
            const packet = api.packet()
            assert.deepEqual(Array.from(packet), [])
            const queue = microtasks ? jobs : timers
            assert.equal(jobs.length, microtasks ? 1 : 0)
            assert.equal(timers.length, microtasks ? 0 : 1)
            while (queue.length) queue.shift()()
            assert.deepEqual(seen, [1, 2])
            assert.deepEqual(Array.from(packet), [0xc0, 0])
        }
    }
})

test('all real distribution formats ignore a frozen timer-backed host scheduler', async () => {
    for (const file of ['mqtt.js', 'mqtt.min.js', 'mqtt.esm.js']) {
        let contents = readFileSync(path.join(root, 'dist', file), 'utf8')
        const { context, jobs, timers } = environment(Object.freeze({ nextTick() { throw Error('host timer used') } }))
        if (file.endsWith('.esm.js')) {
            contents = (await transform(contents, { format: 'cjs' })).code
            context.module = { exports: {} }; context.exports = context.module.exports
        }
        runInNewContext(contents, context)
        const api = file.endsWith('.esm.js') ? context.module.exports.default : context.mqtt
        assert.equal(typeof api.connect, 'function')
        let ran = false
        api.nextTick(() => { ran = true })
        assert.equal(ran, false); assert.equal(timers.length, 0)
        jobs.shift()(); assert.equal(ran, true)
    }
})

test('legacy package resolver fields select the tested ESM bundle, leaving Node main intact', () => {
    const pkg = require('../package.json')
    assert.equal(pkg['react-native'], './dist/mqtt.esm.js')
    assert.equal(pkg.browser[pkg.main], './dist/mqtt.esm.js')
    assert.equal(pkg.main, './build/index.js')
    assert.equal(require('../build/lib/shared').nextTick, process.nextTick)
})

test('plugin reordering is safe; removing the scheduler plugin fails the build', async () => {
    await probe(`import {nextTick} from 'process'; export {nextTick}`, { plugins: [...options.plugins].reverse() })
    await assert.rejects(probe(`import {nextTick} from 'process'; export {nextTick}`, {
        plugins: options.plugins.filter(plugin => plugin.name !== 'browser-process'), logLevel: 'silent',
    }), /shared scheduler|Could not resolve/)
})

test('unknown static scheduler provider forms fail the build', async () => {
    for (const file of ['function', 'variable', 'computed', 'method', 'alias', 'export-alias', 'property-alias', 'computed-method']) {
        await assert.rejects(probe(`import './test/fixtures/browser-process/${file}.js'; export const tick = process.nextTick`,
            { logLevel: 'silent' }), /Unexpected browser nextTick provider/)
    }
})
