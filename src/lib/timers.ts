import isBrowser, { isWebWorker } from './is-browser'
import { clearTimeout as clearT, setTimeout as setT } from 'worker-timers'

// dont directly assign globals to class props otherwise this throws in web workers: Uncaught TypeError: Illegal invocation
// See: https://stackoverflow.com/questions/9677985/uncaught-typeerror-illegal-invocation-in-chrome

const timers: { set: typeof setT; clear: typeof clearT } = {
	set:
		isBrowser && !isWebWorker
			? setT
			: (func, time) => setTimeout(func, time),
	clear: isBrowser && !isWebWorker ? clearT : (timer) => clearTimeout(timer),
}

export default timers
