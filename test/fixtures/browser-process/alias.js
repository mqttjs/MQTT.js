function delayed(callback) { setTimeout(callback, 0) }
const otherProcess = {}
otherProcess.nextTick = delayed
export default otherProcess
