function later(callback) { setTimeout(callback, 0) }
module.exports = { nextTick: later }
