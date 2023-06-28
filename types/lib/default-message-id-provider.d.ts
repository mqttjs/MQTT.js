import { IMessageIdProvider } from './message-id-provider'

/**
 * DefaultMessageIdProvider
 * This is compatible behavior with the original MQTT.js internal messageId allocation.
 */
declare class DefaultMessageIdProvider implements IMessageIdProvider {
  /**
   * DefaultMessageIdProvider constructor.
   * Randomize initial messageId
   * @constructor
   */
  constructor ()

  /**
   * Return the current messageId and increment the current messageId.
   * @return {Number} - messageId
   */
  public allocate (): Number | null

  /**
   * Get the last allocated messageId.
   * @return {Number} - messageId.
   */
  public getLastAllocated (): Number | null

  /**
   * Register the messageId.
   * This function actually nothing and always return true.
   * @param {Number} num - The messageId to request use.
   * @return {Boolean} - If `num` was not occupied, then return true, otherwise return false.
   */
  public register (num: Number): Boolean

  /**
   * Deallocate the messageId.
   * This function actually nothing.
   * @param {Number} num - The messageId to deallocate.
   */
  public deallocate (num: Number): void

  /**
   * Clear all occupied messageIds.
   * This function actually nothing.
   */
  public clear (): void
}

export { DefaultMessageIdProvider }
