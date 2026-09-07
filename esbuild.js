const { build } = require('esbuild')
const { polyfillNode } = require('esbuild-plugin-polyfill-node');
const { rimraf } = require('rimraf')
const fs = require('fs')
const path = require('path')
const { version } = require('./package.json');

const outdir = 'dist'

/**
 * @type {import('esbuild').BuildOptions}
 */
const options = {
    entryPoints: ['build/index.js'],
    bundle: true,
    outfile: `${outdir}/mqtt.js`,
    format: 'iife',
    platform: 'browser',
    globalName: 'mqtt',
    sourcemap: false, // this can be enabled while debugging, if we decide to keep this enabled we should also ship the `src` folder to npm
    metafile: true,
    plugins: [
        {
            name: 'browser-process',
            setup(build) {
                // mqtt-packet corks the stream and uncorks on process.nextTick.
                // The default browser process shim drains that queue with
                // setTimeout(0), which React Native throttles while
                // backgrounded, so writes stall. Resolve process to a
                // queueMicrotask-based shim instead (issue #2053).
                const shim = path.resolve(__dirname, 'scripts/browser-process.ts')
                // readable-stream requires 'process/' (trailing slash).
                build.onResolve({ filter: /^(node:)?process\/?$/ }, () => ({
                    path: shim,
                }))
            }
        },
        polyfillNode({
            // Disable the default process polyfill so plugin order cannot replace our shim.
            polyfills: { process: false, 'readable-stream': true }
        }),
        {
            name: 'resolve-package-json',
            setup(build) {
                // when importing 'package.json' we want to provide a custom object like { version: '1.2.3' }

                build.onResolve({ filter: /package\.json$/ }, args => {
                    return {
                        path: args.path,
                        namespace: 'package-json'
                    }
                })

                build.onLoad({ filter: /.*/, namespace: 'package-json' }, args => {
                    return {
                        contents: JSON.stringify({ version }),
                        loader: 'json'
                    }
                }
                )
            }
        },
        {
            name: 'resolve-socks',
            setup(build) {
                // socks is not supported in the browser and adds several 100kb to the build, so stub it
                build.onResolve({ filter: /socks$/ }, args => {
                    return {
                        path: args.path,
                        namespace: 'socks-stub'
                    }
                })

                build.onLoad({ filter: /.*/, namespace: 'socks-stub' }, args => {
                    return {
                        contents: 'module.exports = {}',
                        loader: 'js'
                    }
                }
                )
            }
        },
    ],
}

async function run() {
    const start = Date.now()
    await rimraf(outdir)
    await buildWithProcessCheck(options)

    options.minify = true
    options.outfile = `${outdir}/mqtt.min.js`
    await buildWithProcessCheck(options)


    options.outfile = `${outdir}/mqtt.esm.js`
    options.format = 'esm'

    await buildWithProcessCheck(options)

    console.log(`Build time: ${Date.now() - start}ms`)
    console.log('Build output:')

    // log generated files with their size in KB
    const files = fs.readdirSync(outdir)
    for (const file of files) {
        const stat = fs.statSync(`${outdir}/${file}`)
        console.log(`- ${file} ${Math.round(stat.size / 1024 * 100) / 100} KB`)
    }
}

async function buildWithProcessCheck(options) {
    const result = await build(options)
    const inputs = Object.keys(result.metafile.inputs)
    if (!inputs.some(input => input.endsWith('scripts/browser-process.ts')) ||
        inputs.some(input => /(?:process\/browser|node\/process)\.(?:js|mjs)$/.test(input))) {
        throw new Error('Browser bundle did not resolve process exclusively to the microtask shim')
    }
    return result
}

if (require.main === module) run().catch((e) => {
    console.error(e)
    process.exit(1)
})

module.exports = { options, buildWithProcessCheck }
