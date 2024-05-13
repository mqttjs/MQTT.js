import type MqttClient from './client'
import getTimer, { type Timer } from './get-timer'
import type { TimerVariant } from './shared'

export default class KeepaliveManager {
	private _keepalive: number

	private timerId: number

	private timer: Timer

	private destroyed = false

	private counter: number

	private client: MqttClient

	private _keepaliveTimeoutTimestamp: number

	/** Timestamp of next keepalive timeout */
	get keepaliveTimeoutTimestamp() {
		return this._keepaliveTimeoutTimestamp
	}

	set keepalive(value: number) {
		// keepalive is in seconds
		value *= 1000

		if (
			// eslint-disable-next-line no-restricted-globals
			isNaN(value) ||
			!Number.isInteger(value) ||
			value < 0 ||
			value > 2147483647
		) {
			throw new Error(
				`Keepalive value must be an integer between 0 and 2147483647. Provided value is ${this._keepalive}`,
			)
		}

		this._keepalive = value
	}

	get keepalive() {
		return this._keepalive
	}

	constructor(client: MqttClient, variant: TimerVariant) {
		this.keepalive = client.options.keepalive
		this.client = client
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
		this.counter = 0
		// https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Figure_3.5_Keep
		this._keepaliveTimeoutTimestamp = Date.now() + this._keepalive * 1.5

		this.timerId = this.timer.set(() => {
			// this should never happen, but just in case
			if (this.destroyed) {
				return
			}

			this.counter += 1

			// after keepalive seconds, send a pingreq
			if (this.counter === 2) {
				this.client.sendPing()
			} else if (this.counter > 2) {
				this.client.onKeepaliveTimeout()
			}
		}, this._keepalive / 2)
	}
}
