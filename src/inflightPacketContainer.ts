import { IPacket } from 'mqtt-packet'


type InflightPacketEntry = {
  callback: (err: Error | null, packet: IPacket | null) => void,
  expiryTime: number
}
export class InflightPacketContainer {
  /**
   * Map iterators preserve insertion order. Must respect invariant that the
   * packet expiring soonest is at the front of the Map.
   */
  private _inflightPackets: Map<string | number, InflightPacketEntry> = new Map()
  private _expiryTimer: NodeJS.Timeout | null = null

  timeoutCallback = () => {
    const nextEntry = this._inflightPackets.entries().next()
    if (nextEntry.done) {
      /* No packets being waited on. */
      this._expiryTimer = null
      return
    }
    const [packetId, { callback, expiryTime }] = nextEntry.value
    if (Date.now() <= expiryTime) {
      /* Packet hasn't expired yet. */
      this._expiryTimer = setTimeout(this.timeoutCallback, Math.max(0, expiryTime - Date.now()))
      return
    }

    callback(new Error(`Packet ${packetId} timed out`), null)
    this._inflightPackets.delete(packetId)
    const nextValue = this._inflightPackets.values().next()
    this._expiryTimer = (nextValue.done ? null : setTimeout(this.timeoutCallback, Math.max(0, nextValue.value.expiryTime - Date.now())))
  }

  async awaitPacket(packetId: string | number): Promise<IPacket | null> {
    if (this._inflightPackets.has(packetId)) {
      throw new Error(`Packet ${packetId} already being waited on`)
    }

    const packetPromise = new Promise<IPacket | null>((resolve, reject) => {
      this._inflightPackets.set(packetId, {
        callback: (err: Error | null, packet: IPacket | null) => {
          err ? reject(err) : resolve(packet)
        },
        expiryTime: Date.now() + 60 * 1000 // TODO: make this configurable
      })
    })

    if (this._expiryTimer === null) {
      this._expiryTimer = setTimeout(this.timeoutCallback, Math.max(0, this._inflightPackets.values().next().value.expiryTime - Date.now()))
    }

    return packetPromise
  }

  resolvePacket(packetId: string | number, packet: IPacket): void {
    if (!this._inflightPackets.has(packetId)) {
      throw new Error(`Packet ${packetId} not being waited on`)
    }
    const { callback } = this._inflightPackets.get(packetId) as InflightPacketEntry
    this._inflightPackets.delete(packetId)
    callback(null, packet)
  }

  cancelPacket(packetId: string | number, err?: Error): void {
    if (!this._inflightPackets.has(packetId)) {
      throw new Error(`Packet ${packetId} not being waited on`)
    }
    const { callback } = this._inflightPackets.get(packetId) as InflightPacketEntry
    this._inflightPackets.delete(packetId)
    callback(err ? err : null, null)
  }
  
  cancelAllPackets(err?: Error): void {
    if (this._expiryTimer !== null) {
      clearTimeout(this._expiryTimer)
      this._expiryTimer = null
    }
    for (const { callback } of this._inflightPackets.values()) {
      callback(err ? err : null, null)
    }
    this._inflightPackets.clear()
  }
}