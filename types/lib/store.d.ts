/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 */
declare class Store {
  constructor ()

  /**
   * Adds a packet to the store, a packet is
   * anything that has a messageId property.
   *
   */
  public put (packet: any, cb?: Function): this

  /**
   * Creates a stream with all the packets in the store
   *
   */
  public createStream (): any

  /**
   * deletes a packet from the store.
   */
  public del (packet: any, cb: Function): this

  /**
   * get a packet from the store.
   */
  public get (packet: any, cb: Function): this

  /**
   * Close the store
   */
  public close (cb: Function): void
}
export { Store }
