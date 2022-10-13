'use strict';
import { IMessageIdProvider } from './message-id-provider';

/**
 * DefaultMessageIdProvider
 * This is compatible behavior with the original MQTT.js internal messageId allocation.
 */
export class DefaultMessageIdProvider implements IMessageIdProvider {
  private nextId: number;
  /**
   * DefaultMessageAllocator constructor
   * Randomize initial messageId
   * @constructor
   */
  constructor() {
    /**
     * MessageIDs starting with 1
     * ensure that nextId is min. 1, see https://github.com/mqttjs/MQTT.js/issues/810
     */
    this.nextId = Math.max(1, Math.floor(Math.random() * 65535));
  }

  /**
   * Return the current messageId and increment the current messageId.
   * @return {number} - messageId
   */
  public allocate(): number {
    // id becomes current state of this.nextId and increments afterwards
    const id = this.nextId++;
    // Ensure 16 bit unsigned int (max 65535, nextId got one higher)
    if (this.nextId === 65536) {
      this.nextId = 1;
    }
    return id;
  }

  /**
   * Get the last allocated messageId.
   * @return {number} - messageId.
   */
  public getLastAllocated(): number {
    return this.nextId === 1 ? 65535 : this.nextId - 1;
  }

  /**
   * Register the messageId.
   * This function actually does nothing and always return true.
   * @param {number} num - The messageId to request use.
   * @return {boolean} - If `num` was not occupied, then return true, otherwise return false.
   */
  public register(_messageId: number): boolean {
    return true;
  }

  /**
   * Deallocate the messageId.
   * This function actually does nothing.
   * @param {number} num - The messageId to deallocate.
   */
  public deallocate(_messageId: number): void {}

  /**
   * Clear all occupied messageIds.
   * This function actually does nothing.
   */
  public clear(): void {}
}
