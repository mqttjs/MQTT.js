const { build } = require('esbuild')
const { polyfillNode } = require('esbuild-plugin-polyfill-node')

/**
 * @type {import('esbuild').BuildOptions}
 */
const options = {
    entryPoints: ['build/mqtt.js'],
    bundle: true,
    outfile: 'dist/mqtt.js',
    format: 'cjs',
    target: 'es2020',
    platform: 'browser',
    globalName: 'mqtt',
    define: {
        'global': 'window',
    },
    plugins: [
        polyfillNode({
            polyfills: [
                'buffer',
                'readable-stream',
            ]
        }),
    ],
}

async function run() {
    await build(options)

    options.outfile = 'dist/mqtt.esm.js'
    options.format = 'esm'
    options.minify = true

    await build(options)
}

run().catch((e) => {
    console.error(e)
    process.exit(1)
})