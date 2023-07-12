const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const polyfills = require('rollup-plugin-node-polyfills');

module.exports = {
    input: './lib/connect/index.js',
    output: {
        format: 'umd',
        file: 'dist/mqtt.js',
        name: 'mqtt',
        globals: {
            //lodash: '_',
        },
        exports: 'named',
    },
    plugins: [
        commonjs(),
        nodeResolve({
            preferBuiltins: true,
            browser: true,
            mainFields: ['module', 'main', 'browser'],
        }),
        polyfills(),
    ],
    context: 'window'
};