import { clearTimeout as clearT, setTimeout as setT } from 'worker-timers'
import isBrowser, { isWebWorker } from './is-browser'

export default class PingTimer {
	private keepalive: number

	private timer: any

	private checkPing: () => void

	// dont directly assign globals to class props otherwise this throws in web workers: Uncaught TypeError: Illegal invocation
	// See: https://stackoverflow.com/questions/9677985/uncaught-typeerror-illegal-invocation-in-chrome
	private _setTimeout: typeof setT =
		isBrowser && !isWebWorker
			? setT
			: (func, time) => setTimeout(func, time)

	private _clearTimeout: typeof clearT =
		isBrowser && !isWebWorker ? clearT : (timer) => clearTimeout(timer)

	constructor(keepalive: number, checkPing: () => void) {
		this.keepalive = keepalive * 1000
		this.checkPing = checkPing
		this.reschedule()
	}

	clear() {
		if (this.timer) {
			this._clearTimeout(this.timer)
			this.timer = null
		}
	}

	reschedule() {
		this.clear()
		this.timer = this._setTimeout(() => {
			this.checkPing()
			// prevent possible race condition where the timer is destroyed on _cleauUp
			// and recreated here
			if (this.timer) {
				this.reschedule()
			}
		}, this.keepalive)
	}
}
