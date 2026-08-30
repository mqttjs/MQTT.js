const pending: Array<{
	fun: (...args: any[]) => void
	args: any[]
}> = []
let draining = false

function runNextTicks() {
	draining = true
	while (pending.length) {
		const item = pending.shift()
		item.fun(...item.args)
	}
	draining = false
}

function scheduleDrain() {
	if (typeof queueMicrotask === 'function') {
		queueMicrotask(runNextTicks)
	} else {
		setTimeout(runNextTicks, 0)
	}
}

export function nextTick(fun: (...args: any[]) => void, ...args: any[]): void {
	if (typeof fun !== 'function') {
		throw new TypeError('"callback" argument must be a function')
	}
	pending.push({ fun, args })
	if (pending.length === 1 && !draining) {
		scheduleDrain()
	}
}

function noop() {}

export const title = 'browser'
export const browser = true
export const env: Record<string, string | undefined> = {}
export const argv: string[] = []
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
