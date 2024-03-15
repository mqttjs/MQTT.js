
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
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
    'check-coverage': true,
}