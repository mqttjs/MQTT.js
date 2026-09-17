import { nextTick } from './browser-next-tick'

/** Repair legacy browser hosts used by dependencies that read global process. */
export function ensureBrowserProcessNextTick(host: {
	nextTick?: unknown
}): void {
	if (typeof host.nextTick === 'function') return
	if (!Reflect.set(host, 'nextTick', nextTick)) {
		throw new Error(
			'MQTT.js cannot install process.nextTick on this read-only browser host; use mqtt/dist/mqtt.esm instead of the unbundled entry',
		)
	}
}
