const otherProcess = {}
otherProcess['nextTick'] = callback => setTimeout(callback, 0)
export default otherProcess
