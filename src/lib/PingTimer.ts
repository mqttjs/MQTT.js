export default class PingTimer {
	private keepalive: number

	private timer: any

	private checkPing: () => void

	constructor(keepalive: number, checkPing: () => void) {
		this.keepalive = keepalive * 1000
		this.checkPing = checkPing
		this.setup()
	}

	private setup() {
		this.timer = setTimeout(() => {
			this.checkPing()
			this.reschedule()
		}, this.keepalive)
	}

	clear() {
		if (this.timer) {
			clearTimeout(this.timer)
			this.timer = null
		}
	}

	reschedule() {
		this.clear()
		this.setup()
	}
}
