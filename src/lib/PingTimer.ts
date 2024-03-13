import timers from './timers'

export default class PingTimer {
	private keepalive: number

	private timer: any

	private checkPing: () => void

	constructor(keepalive: number, checkPing: () => void) {
		this.keepalive = keepalive * 1000
		this.checkPing = checkPing
		this.reschedule()
	}

	clear() {
		if (this.timer) {
			timers.clear(this.timer)
			this.timer = null
		}
	}

	reschedule() {
		this.clear()
		this.timer = timers.set(() => {
			this.checkPing()
			// prevent possible race condition where the timer is destroyed on _cleauUp
			// and recreated here
			if (this.timer) {
				this.reschedule()
			}
		}, this.keepalive)
	}
}
