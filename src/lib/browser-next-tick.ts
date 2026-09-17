// Browser microtasks share the Promise job queue, unlike Node's nextTick queue.
// Limit each drain so recursively queued callbacks cannot starve timers or I/O.
const MAX_CALLBACKS_PER_DRAIN = 1024
type Tick = { callback: (...args: any[]) => void; args: any[] }
let pending: Tick[] = []
let currentBatch: Tick[] = []
let nextIndex = 0
let draining = false
let scheduled = false
let reportedTimerFallback = false
let reportedInterruption = false

function diagnostic(message: string) {
	// Load lazily: debug itself consumes process, so eager initialization cycles.
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require('debug')('mqttjs:nextTick')(message)
	} catch {
		// Optional diagnostics must not mask callback errors or strand the queue.
	}
}

function scheduleDrain(yieldToTimers = false) {
	scheduled = true
	if (!yieldToTimers && typeof queueMicrotask === 'function') {
		queueMicrotask(runNextTicks)
	} else {
		if (!yieldToTimers && !reportedTimerFallback) {
			reportedTimerFallback = true
			diagnostic('queueMicrotask unavailable; falling back to timers')
		}
		setTimeout(runNextTicks, 0)
	}
}

function runNextTicks() {
	scheduled = false
	draining = true
	let processed = 0
	try {
		while (processed < MAX_CALLBACKS_PER_DRAIN) {
			if (nextIndex === currentBatch.length) {
				currentBatch = pending
				pending = []
				nextIndex = 0
				if (!currentBatch.length) break
			}
			const item = currentBatch[nextIndex]
			// Release executed closures, but preserve the cursor across yield/throw.
			currentBatch[nextIndex++] = undefined
			processed++
			item.callback(...item.args)
		}
	} catch (error) {
		if (!reportedInterruption) {
			reportedInterruption = true
			diagnostic(
				'callback interrupted drain; remaining callbacks rescheduled',
			)
		}
		throw error
	} finally {
		draining = false
		if (nextIndex < currentBatch.length || pending.length) {
			scheduleDrain(processed >= MAX_CALLBACKS_PER_DRAIN)
		} else {
			currentBatch = []
			nextIndex = 0
		}
	}
}

export function nextTick(
	callback: (...args: any[]) => void,
	...args: any[]
): void {
	if (typeof callback !== 'function') {
		throw new TypeError('"callback" argument must be a function')
	}
	pending.push({ callback, args })
	if (!scheduled && !draining) scheduleDrain()
}
