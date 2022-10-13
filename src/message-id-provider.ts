/**
 * MessageIdProvider
 */
export interface IMessageIdProvider {
  /**
   * Allocate the first vacant messageId. The messageId become occupied status.
   * @return {number} - The first vacant messageId. If all messageIds are occupied, return null.
   */
  allocate(): number | null;

  /**
   * Get the last allocated messageId.
   * @return {number} - messageId.
   */
  getLastAllocated(): number | null;

  /**
   * Register the messageId. The messageId become occupied status.
   * If the messageId has already been occupied, then return false.
   * @param {number} num - The messageId to request use.
   * @return {boolean} - If `num` was not occupied, then return true, otherwise return false.
   */
  register(num: number): Boolean;

  /**
   * Deallocate the messageId. The messageId become vacant status.
   * @param {number} num - The messageId to deallocate. The messageId must be occupied status.
   *                       In other words, the messageId must be allocated by allocate() or
   *                       occupied by register().
   */
  deallocate(num: number): void;

  /**
   * Clear all occupied messageIds.
   * The all messageIds are set to vacant status.
   */
  clear(): void;
}
