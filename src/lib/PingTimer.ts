import { clearTimeout as clearT, setTimeout as setT } from 'worker-timers'
import isBrowser from './is-browser'

export default class PingTimer {
	private keepalive: number

	private timer: any

	private checkPing: () => void

	private setTimeout = isBrowser ? setT : setTimeout

	private clearTimeout = isBrowser ? clearT : clearTimeout

	constructor(keepalive: number, checkPing: () => void) {
		this.keepalive = keepalive * 1000
		this.checkPing = checkPing
		this.setup()
	}

	private setup() {
		this.timer = this.setTimeout(() => {
			this.checkPing()
			this.reschedule()
		}, this.keepalive)
	}

	clear() {
		if (this.timer) {
			this.clearTimeout(this.timer)
			this.timer = null
		}
	}

	reschedule() {
		this.clear()
		this.setup()
	}
}
