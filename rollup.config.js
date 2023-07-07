const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

module.exports = {
    input: 'lib/connect/index.js',
    output: {
        format: 'es',
        file: 'dist/mqtt.js',
        globals: {
            //lodash: '_',
        },
    },
    plugins: [
        commonjs(),
        nodeResolve({
            preferBuiltins: false,
            browser: true,
            mainFields: ['module', 'main', 'browser'],
        }),
    ],
    context: 'window',
    external: ['https', 'http', 'tty', 'net', 'tls', 'crypto', 'stream', 'zlib'],
};