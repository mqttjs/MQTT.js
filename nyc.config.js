
module.exports = {
    include: [
        'src/**',
    ],
    exclude: [
        'src/bin/*',
        'src/lib/BufferedDuplex.ts',
        'src/connect/wx.ts',
        'src/connect/ali.ts',
    ],
    reporter: [
        'text',
        'lcov'
    ],
    branches: 80,
    functions: 89,
    lines: 86,
    statements: 86,
    'check-coverage': true
}