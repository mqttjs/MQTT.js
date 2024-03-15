import isBrowser, { isWebWorker } from './is-browser'
import { clearTimeout as clearT, setTimeout as setT } from 'worker-timers'
import type { TimerVariant } from './shared'

// dont directly assign globals to class props otherwise this throws in web workers: Uncaught TypeError: Illegal invocation
// See: https://stackoverflow.com/questions/9677985/uncaught-typeerror-illegal-invocation-in-chrome

export interface Timer {
	set: typeof setT
	clear: typeof clearT
}

const workerTimer: Timer = {
	set: setT,
	clear: clearT,
}

const nativeTimer: Timer = {
	set: (func, time) => setTimeout(func, time),
	clear: (timerId) => clearTimeout(timerId),
}

const getTimer = (variant: TimerVariant): Timer => {
	switch (variant) {
		case 'native': {
			return nativeTimer
		}
		case 'worker': {
			return workerTimer
		}
		case 'auto':
		default: {
			return isBrowser && !isWebWorker ? workerTimer : nativeTimer
		}
	}
}

export default getTimer
