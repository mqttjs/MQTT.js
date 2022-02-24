/* Keeps track of free and used packet ids by storing available IDs as intervals */
export class PacketIdAllocator {
  /**
   * Intervals are stored in reverse order since push/pop from end of a list is
   * faster than shift/unshift from beginning.
   */
  private _intervals: [number, number][] = [[65535, 1]];

  async allocate(): Promise<number> {
    if (this._intervals.length === 0) {
      /* TODO: return promise that resolves when a new packet ID is available */
      throw new Error('No more packet ids available');
    }

    const lastInterval = this._intervals[this._intervals.length - 1] as [number, number];
    const [lastIntervalMax, lastIntervalMin] = lastInterval;
    if (lastIntervalMax === lastIntervalMin) {
      /* We just used the last packet ID in the interval, so remove it. */
      this._intervals.pop();
    } else {
      /* We are using the lowest value in the interval, so increment the min */
      ++lastInterval[1];
    }
    return lastIntervalMin;
  }

  release(id: number): void {
    if (this._intervals.length === 0) {
      this._intervals.push([id, id]);
      return;
    }
    let lastInterval = this._intervals[this._intervals.length - 1] as [number, number];
    let lastIntervalMin = lastInterval[1];
    if (id < lastIntervalMin - 1) {
      this._intervals.push([id, id]);
      return;
    }
    if (id === lastIntervalMin - 1) {
      --lastInterval[1]
      return;
    }

    const insertionPoint = this._intervals.findIndex(([max]) => id > max)
    if (insertionPoint === -1) {
      throw new Error('Packet ID already released')
    }

    const insertionPointInterval = this._intervals[insertionPoint] as [number, number];
    const beforeInsertionPointInterval = this._intervals[insertionPoint - 1];
    const [insertionPointMax, insertionPointMin] = insertionPointInterval;
    if (id - 1 === insertionPointMax && id + 1 === beforeInsertionPointInterval?.[1]) {
      /* The ID is adjacent to two intervals, so we can merge them. */
      beforeInsertionPointInterval[1] = insertionPointMin; // Merge the two intervals
      this._intervals.splice(insertionPoint, 1); // Remove the extraneous interval
    } else if (id === insertionPointMax + 1) {
      /**
       * The ID is at the high end of insertionPointInterval, so we can
       * increment the max
       */
      ++insertionPointInterval[0];
    } else if (id + 1 === beforeInsertionPointInterval?.[1]) {
      /**
       * The ID is at the low end of beforeInsertionPointInterval, so we can
       * decrement the min
       */ 
      --beforeInsertionPointInterval[1];
    } else {
      /** 
       * The ID is in the middle of two intervals, so we must insert a new
       * interval
       */
      this._intervals.splice(insertionPoint, 0, [id, id]);
    }
  }
}