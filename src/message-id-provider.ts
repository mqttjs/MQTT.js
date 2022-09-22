'use strict';

export interface MessageIdProvider {
  /**
   * allocate
   *
   * Get the next messageId.
   * @return unsigned int
   */
  allocate: () => number;

  /**
   * getLastAllocated
   * Get the last allocated messageId.
   * @return unsigned int
   */
  getLastAllocated: () => number;

  /**
   * register
   * Register messageId. If success return true, otherwise return false.
   * @param { unsigned int } - messageId to register,
   * @return boolean
   */
  register: (messageId: number) => boolean;

  /**
   * deallocate
   * Deallocate messageId.
   * @param { unsigned int } - messageId to deallocate,
   */
  deallocate: (messageId: number) => void;

  /**
   * clear
   * Deallocate all messageIds.
   */
  clear: () => void;
}
