// Bundled in place of `process`: jspm's nextTick runs on setTimeout, which React Native throttles in the background (#2053)
import process from 'process'

export * from 'process'

const schedule =
    typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => setTimeout(fn, 0)

export function nextTick(callback, ...args) {
    schedule(() => callback(...args))
}

export default { ...process, nextTick }
