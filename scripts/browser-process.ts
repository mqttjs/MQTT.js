// Build-only process shim: microtasks keep MQTT writes moving when React Native
// throttles background timers. Browser microtasks share the Promise job queue;
// they cannot reproduce Node's separate nextTick queue ordering.
const pending: Array<{
	callback: (...args: any[]) => void
	args: any[]
}> = []
let draining = false

function runNextTicks() {
	draining = true
	try {
		while (pending.length) {
			const item = pending.shift()
			item.callback(...item.args)
		}
	} finally {
		draining = false
		// A throwing user callback must not strand the remaining queue.
		if (pending.length) scheduleDrain()
	}
}

function scheduleDrain() {
	if (typeof queueMicrotask === 'function') {
		queueMicrotask(runNextTicks)
	} else {
		setTimeout(runNextTicks, 0)
	}
}

export function nextTick(
	callback: (...args: any[]) => void,
	...args: any[]
): void {
	if (typeof callback !== 'function') {
		throw new TypeError('"callback" argument must be a function')
	}
	pending.push({ callback, args })
	// Schedule once for a new queue; nested ticks are consumed by the active drain.
	if (pending.length === 1 && !draining) {
		scheduleDrain()
	}
}

const noop = () => undefined

export const title = 'browser'
export const browser = true
export const env: Record<string, string | undefined> = {}
export const argv: string[] = []
// An empty version deliberately selects the compatible process-nextick-args wrapper.
export const version = ''
export const versions: Record<string, string | undefined> = {}
export const on = noop
export const addListener = noop
export const once = noop
export const off = noop
export const removeListener = noop
export const removeAllListeners = noop
export const emit = noop
export const prependListener = noop
export const prependOnceListener = noop
export function listeners() {
	return []
}
export function binding() {
	throw new Error('process.binding is not supported')
}
export function cwd() {
	return '/'
}
export function chdir() {
	throw new Error('process.chdir is not supported')
}
export function umask() {
	return 0
}

const browserProcess = {
	title,
	browser,
	env,
	argv,
	version,
	versions,
	nextTick,
	on,
	addListener,
	once,
	off,
	removeListener,
	removeAllListeners,
	emit,
	prependListener,
	prependOnceListener,
	listeners,
	binding,
	cwd,
	chdir,
	umask,
}

export default browserProcess
