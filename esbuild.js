import { build } from 'esbuild'
import { polyfillNode } from 'esbuild-plugin-polyfill-node'
import { rimraf } from 'rimraf'
import fs from 'fs'
import path from 'path'
import pkg from './package.json' with { type: 'json' }

const { version } = pkg

const outdir = 'dist'
const entry = './build/index.js'

/**
 * @type {import('esbuild').BuildOptions}
 */
export const options = {
    entryPoints: [entry],
    bundle: true,
    outfile: `${outdir}/mqtt.js`,
    format: 'iife',
    platform: 'browser',
    globalName: 'mqtt',
    sourcemap: false, // this can be enabled while debugging, if we decide to keep this enabled we should also ship the `src` folder to npm
    plugins: [
        {
            name: 'resolve-process',
            setup(build) {
                const shim = path.join(import.meta.dirname, 'scripts/browser-process.js')
                // `process` and readable-stream's `process/` both go to the shim; the shim's own import falls through to jspm
                build.onResolve({ filter: /^(node:)?process\/?$/ }, args => {
                    if (args.importer === shim) return
                    return { path: shim }
                })
            }
        },
        polyfillNode({
            polyfills: [
                'readable-stream'
            ]
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
                // also matches our own ./socks.js wrapper, which pulls in node-only stream/assert/dns
                build.onResolve({ filter: /socks(\.js)?$/ }, args => {
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

export function esmOptions() {
    return {
        ...options,
        outfile: `${outdir}/mqtt.esm.js`,
        format: 'esm',
        minify: true,
    }
}

async function run() {
    const start = Date.now()
    await rimraf(outdir)
    await build(options)
    await build({ ...options, minify: true, outfile: `${outdir}/mqtt.min.js` })
    await build(esmOptions())

    console.log(`Build time: ${Date.now() - start}ms`)
    console.log('Build output:')

    // log generated files with their size in KB
    const files = fs.readdirSync(outdir)
    for (const file of files) {
        const stat = fs.statSync(`${outdir}/${file}`)
        console.log(`- ${file} ${Math.round(stat.size / 1024 * 100) / 100} KB`)
    }
}

if (import.meta.main) {
    run().catch((e) => {
        console.error(e)
        process.exit(1)
    })
}
