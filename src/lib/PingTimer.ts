import getTimer from './get-timer'
import type { TimerVariant } from './shared'

export default class PingTimer {
	private keepalive: number

	private timer: any

	private variant: TimerVariant

	private checkPing: () => void

	constructor(
		keepalive: number,
		checkPing: () => void,
		variant: TimerVariant,
	) {
		this.keepalive = keepalive * 1000
		this.checkPing = checkPing
		this.variant = variant
		this.reschedule()
	}

	clear() {
		if (this.timer) {
			getTimer(this.variant).clear(this.timer)
			this.timer = null
		}
	}

	reschedule() {
		this.clear()
		this.timer = getTimer(this.variant).set(() => {
			this.checkPing()
			// prevent possible race condition where the timer is destroyed on _cleauUp
			// and recreated here
			if (this.timer) {
				this.reschedule()
			}
		}, this.keepalive)
	}
}
