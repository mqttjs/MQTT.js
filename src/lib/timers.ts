import {
	clearInterval,
	clearTimeout,
	setInterval,
	setTimeout,
} from 'worker-timers'
import isBrowser from './is-browser'

const nextTick = process
	? process.nextTick
	: (callback: () => void) => {
			setTimeout(callback, 0)
	  }

if (isBrowser) {
	globalThis.setImmediate =
		globalThis.setImmediate ||
		(((...args: any[]) => {
			const callback = args.shift()
			nextTick(() => {
				callback(...args)
			})
		}) as typeof globalThis.setImmediate)
	globalThis.clearInterval = clearInterval
	globalThis.clearTimeout = clearTimeout
	globalThis.setInterval =
		setInterval as unknown as typeof globalThis.setInterval
	globalThis.setTimeout =
		setTimeout as unknown as typeof globalThis.setTimeout
}

export default nextTick
