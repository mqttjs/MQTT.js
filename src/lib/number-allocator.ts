/**
 * Inline number allocator — replaces the `number-allocator` package
 * (which pulled in `js-sdsl` and `debug` as transitive dependencies).
 *
 * Tracks used numbers in a Set and scans for the smallest vacant.
 * For MQTT's 16-bit ID range (1–65535) this is more than fast enough.
 */
export class NumberAllocator {
	private used: Set<number>

	private min: number

	private max: number

	// Optimization: tracks the lowest number that *might* be vacant,
	// avoiding full scans in the common sequential-allocation case.
	private lowWaterMark: number

	constructor(min: number, max: number) {
		this.min = min
		this.max = max
		this.used = new Set()
		this.lowWaterMark = min
	}

	/**
	 * Get the first vacant number without allocating it.
	 * @returns The first vacant number, or null if all are occupied.
	 */
	firstVacant(): number | null {
		if (this.used.size === this.max - this.min + 1) {
			return null
		}
		for (let i = this.lowWaterMark; i <= this.max; i++) {
			if (!this.used.has(i)) {
				return i
			}
		}
		return null
	}

	/**
	 * Allocate the first vacant number. It becomes occupied.
	 * @returns The first vacant number, or null if all are occupied.
	 */
	alloc(): number | null {
		if (this.used.size === this.max - this.min + 1) {
			return null
		}
		for (let i = this.lowWaterMark; i <= this.max; i++) {
			if (!this.used.has(i)) {
				this.used.add(i)
				this.lowWaterMark = i + 1
				return i
			}
		}
		return null
	}

	/**
	 * Mark a specific number as occupied.
	 * @returns true if the number was vacant (now occupied), false if already occupied or out of range.
	 */
	use(num: number): boolean {
		if (num < this.min || num > this.max || this.used.has(num)) {
			return false
		}
		this.used.add(num)
		return true
	}

	/**
	 * Deallocate a number, making it vacant again.
	 */
	free(num: number): void {
		if (num < this.min || num > this.max) {
			return
		}
		this.used.delete(num)
		if (num < this.lowWaterMark) {
			this.lowWaterMark = num
		}
	}

	/**
	 * Clear all occupied numbers. Everything becomes vacant.
	 */
	clear(): void {
		this.used.clear()
		this.lowWaterMark = this.min
	}
}
