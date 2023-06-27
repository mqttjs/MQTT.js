import { IMessageIdProvider } from './message-id-provider'

/**
 * UniqueMessageIdProvider
 */
declare class UniqueMessageIdProvider implements IMessageIdProvider {
  /**
   * UniqueMessageIdProvider constructor.
   * @constructor
   */
  constructor ()

  /**
   * Allocate the first vacant messageId. The messageId become occupied status.
   * @return {Number} - The first vacant messageId. If all messageIds are occupied, return null.
   */
  public allocate (): Number | null

  /**
   * Get the last allocated messageId.
   * @return {Number} - messageId.
   */
  public getLastAllocated (): Number | null

  /**
   * Register the messageId. The messageId become occupied status.
   * If the messageId has already been occupied, then return false.
   * @param {Number} num - The messageId to request use.
   * @return {Boolean} - If `num` was not occupied, then return true, otherwise return false.
   */
  public register (num: Number): Boolean

  /**
   * Deallocate the messageId. The messageId become vacant status.
   * @param {Number} num - The messageId to deallocate. The messageId must be occupied status.
   *                       In other words, the messageId must be allocated by allocate() or
   *                       occupied by register().
   */
  public deallocate (num: Number): void

  /**
   * Clear all occupied messageIds.
   * The all messageIds are set to vacant status.
   */
  public clear (): void
}

export { UniqueMessageIdProvider }
