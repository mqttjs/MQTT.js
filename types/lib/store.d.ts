/**
 * In-memory implementation of the message store
 * This can actually be saved into files.
 *
 */
declare class Store {
    constructor();
    /**
     * Adds a packet to the store, a packet is
     * anything that has a messageId property.
     *
     */
    put(packet: any, cb?: any): this;
    /**
     * Creates a stream with all the packets in the store
     *
     */
    createStream(): any;
    /**
     * deletes a packet from the store.
     */
    del(packet: any, cb: any): this;
    /**
     * get a packet from the store.
     */
    get(packet: any, cb: any): this;
    /**
     * Close the store
     */
    close(cb: any): void;
}
export { Store };
