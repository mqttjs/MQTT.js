var process
process.nextTick = setTimeout
process.title = 'browser'

module.exports = process
