import getTimer, { type Timer } from './get-timer'
import type { TimerVariant } from './shared'

export default class PingTimer {
	private keepalive: number

	private timerId: number

	private timer: Timer

	private checkPing: () => void

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

	clear() {
		if (this.timerId) {
			this.timer.clear(this.timerId)
			this.timerId = null
		}
	}

	reschedule() {
		this.clear()
		this.timerId = this.timer.set(() => {
			this.checkPing()
			// prevent possible race condition where the timer is destroyed on _cleauUp
			// and recreated here
			if (this.timerId) {
				this.reschedule()
			}
		}, this.keepalive)
	}
}
