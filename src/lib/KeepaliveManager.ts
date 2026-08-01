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

	private _intervalEvery: number

	// 修复：跟踪是否有未确认的 PINGREQ
	// 避免 PINGRESP 延迟导致 reschedule，进而导致下一次 PINGREQ 延迟
	private _waitingForPingResp: boolean

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
		this._waitingForPingResp = false
		this.setKeepalive(client.options.keepalive)
	}

	private clear() {
		if (this.timerId) {
			this.timer.clear(this.timerId)
			this.timerId = null
		}
	}

	/** Change the keepalive */
	setKeepalive(value: number) {
		// keepalive is in seconds
		value *= 1000

		if (isNaN(value) || value <= 0 || value > 2147483647) {
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
		this._waitingForPingResp = false

		// https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Figure_3.5_Keep
		const keepAliveTimeout = Math.ceil(this._keepalive * 1.5)

		this._keepaliveTimeoutTimestamp = Date.now() + keepAliveTimeout
		this._intervalEvery = Math.ceil(this._keepalive / 2)

		this.timerId = this.timer.set(() => {
			// this should never happen, but just in case
			if (this.destroyed) {
				return
			}

			this.counter += 1

			// after keepalive seconds, send a pingreq
			if (this.counter === 2) {
				if (this._waitingForPingResp) {
					// 上一个 PINGREQ 还没收到 PINGRESP，不发送新的 PINGREQ
					// 等待超时检查（counter >= 3 时）
				} else {
					this.client.sendPing()
					this._waitingForPingResp = true
					this.counter = 0 // 重置 counter，每 keepalive 秒发送一次
				}
			} else if (this.counter >= 3) {
				if (this._waitingForPingResp) {
					// PINGREQ 发送后 keepalive*1.5 秒内未收到 PINGRESP，触发超时
					this.client.onKeepaliveTimeout()
				} else {
					// PINGRESP 已收到，重置 counter 恢复正常
					this.counter = 0
				}
			}
		}, this._intervalEvery)
	}

	/**
	 * 收到 PINGRESP 时调用
	 * 修复：只重置 _waitingForPingResp 标志，不 reschedule 定时器
	 * 原代码调用 reschedule() 会重置整个定时器，导致 PINGRESP 延迟
	 * 传播到下一次 PINGREQ 的发送时间
	 */
	resetWaitingState() {
		if (this.destroyed) {
			return
		}
		this._waitingForPingResp = false
		const keepAliveTimeout = Math.ceil(this._keepalive * 1.5)
		this._keepaliveTimeoutTimestamp = Date.now() + keepAliveTimeout
	}
}
