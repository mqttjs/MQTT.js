import getTimer, { type Timer } from './get-timer'
import type { TimerVariant } from './shared'

export default class PingTimer {
	private keepalive: number

	private timerId: number

	private timer: Timer

	private checkPing: () => void

	private destroyed = false

	constructor(
		keepalive: number,
		checkPing: () => void,
		variant: TimerVariant,
	) {
		this.keepalive = keepalive * 1000
		this.checkPing = checkPing
		this.timer = getTimer(variant)
		this.reschedule()
	}

	private clear() {
		if (this.timerId) {
			this.timer.clear(this.timerId)
			this.timerId = null
		}
	}

	destroy() {
		this.clear()
		this.destroyed = true
	}

	reschedule() {
		if (this.destroyed) {
			return
		}

		this.clear()
		this.timerId = this.timer.set(() => {
			// this should never happen, but just in case
			if (this.destroyed) {
				return
			}

			this.checkPing()
			// this must be called after `checkPing` otherwise in case `destroy`
			// is called in `checkPing` the timer would be rescheduled anyway
			this.reschedule()
		}, this.keepalive)
	}
}
