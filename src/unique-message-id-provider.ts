'use strict';

import { NumberAllocator } from 'number-allocator';

export class UniqueMessageIdProvider {
  private numberAllocator: NumberAllocator;
  private lastId: number | undefined;

  /**
   * UniqueMessageAllocator constructor
   * @constructor
   */

  constructor() {
    this.lastId = undefined;
    this.numberAllocator = new NumberAllocator(1, 65535);
  }

  /**
   * allocate
   *
   * Get the next messageId.
   * @return if messageId is fully allocated then return undefined,
   *         otherwise return the smallest usable unsigned int messageId.
   */
  public allocate(): number | undefined {
    this.lastId = this.numberAllocator.alloc() || undefined;
    return this.lastId;
  }

  /**
   * getLastAllocated
   * Get the last allocated messageId.
   * @return unsigned int
   */
  public getLastAllocated(): number | undefined {
    return this.lastId;
  }

  /**
   * register
   * Register messageId. If success return true, otherwise return false.
   * @param { unsigned int } - messageId to register,
   * @return boolean
   */
  public register(messageId: number): boolean {
    return this.numberAllocator.use(messageId).valueOf();
  }

  /**
   * deallocate
   * Deallocate messageId.
   * @param { unsigned messageId } - messageId to deallocate,
   */
  public deallocate(messageId: number): void {
    this.numberAllocator.free(messageId);
  }

  /**
   * clear
   * Deallocate all messageIds.
   */
  public clear(): void {
    this.numberAllocator.clear();
  }
}
