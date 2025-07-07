import type MqttClient from './client.js'
import getTimer, { type Timer } from './get-timer.js'
import type { TimerVariant } from './shared.js'

export default class KeepaliveManager {
	// @ts-expect-error - @TODO: @robertsLando: You have a situation where _keepalive can be undefined which will lead to cascading problems due to _keepalive being always used directly as a number.
	private _keepalive: number

	private timerId: number | undefined

	private timer: Timer

	private destroyed = false

	private counter: number = 0

	private client: MqttClient

	private _keepaliveTimeoutTimestamp: number | undefined

	private _intervalEvery: number | undefined

	/** Timestamp of next keepalive timeout */
	get keepaliveTimeoutTimestamp() {
		return this._keepaliveTimeoutTimestamp
	}

	/** Milliseconds of the actual interval */
	get intervalEvery() {
		return this._intervalEvery
	}

	get keepalive() {
		return this._keepalive
	}

	constructor(client: MqttClient, variant: TimerVariant | Timer) {
		this.client = client
		this.timer =
			typeof variant === 'object' &&
			'set' in variant &&
			'clear' in variant
				? variant
				: getTimer(variant)
		if (client.options.keepalive !== undefined) {
			this.setKeepalive(client.options.keepalive)
		}
	}

	private clear() {
		if (this.timerId !== undefined) {
			this.timer.clear(this.timerId)
			this.timerId = undefined
		}
	}

	/** Change the keepalive */
	setKeepalive(value: number) {
		// keepalive is in seconds
		value *= 1000

		if (
			// eslint-disable-next-line no-restricted-globals
			isNaN(value) ||
			value <= 0 ||
			value > 2147483647
		) {
			throw new Error(
				`Keepalive value must be an integer between 0 and 2147483647. Provided value is ${value}`,
			)
		}

		this._keepalive = value

		this.reschedule()

		this.client['log'](`KeepaliveManager: set keepalive to ${value}ms`)
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
		// @TODO: this._keepalive may be undefined. This operation will result in NaN.
		const keepAliveTimeout = Math.ceil(this._keepalive * 1.5)

		this._keepaliveTimeoutTimestamp = Date.now() + keepAliveTimeout
		// @TODO: this._keepalive may be undefined. This operation will result in NaN.
		this._intervalEvery = Math.ceil(this._keepalive / 2)

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
		}, this._intervalEvery)
	}
}
