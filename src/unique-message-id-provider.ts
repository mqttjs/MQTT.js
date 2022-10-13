'use strict';

import { NumberAllocator } from 'number-allocator';
import { IMessageIdProvider } from './message-id-provider';

/**
 * UniqueMessageIdProvider
 */
export class UniqueMessageIdProvider implements IMessageIdProvider {
  private numberAllocator: NumberAllocator;
  private lastId: number | null;

  /**
   * UniqueMessageIdProvider constructor.
   * @constructor
   */
  constructor() {
    this.lastId = null;
    this.numberAllocator = new NumberAllocator(1, 65535);
  }

  /**
   * Allocate the first vacant messageId. The messageId become occupied status.
   * @return {number} - The first vacant messageId. If all messageIds are occupied, return null.
   */
  public allocate(): number | null {
    this.lastId = this.numberAllocator.alloc();
    return this.lastId;
  }

  /**
   * Get the last allocated messageId.
   * @return {number} - messageId.
   */
  public getLastAllocated(): number | null {
    return this.lastId;
  }

  /**
   * Register the messageId. The messageId become occupied status.
   * If the messageId has already been occupied, then return false.
   * @param {number} num - The messageId to request use.
   * @return {boolean} - If `num` was not occupied, then return true, otherwise return false.
   */
  public register(messageId: number): boolean {
    return this.numberAllocator.use(messageId).valueOf();
  }

  /**
   * Deallocate the messageId. The messageId become vacant status.
   * @param {number} num - The messageId to deallocate. The messageId must be occupied status.
   *                       In other words, the messageId must be allocated by allocate() or
   *                       occupied by register().
   */
  public deallocate(messageId: number): void {
    this.numberAllocator.free(messageId);
  }

  /**
   * Clear all occupied messageIds.
   * The all messageIds are set to vacant status.
   */
  public clear(): void {
    this.numberAllocator.clear();
  }
}
