
export async function handlePing () {
  debug('_setupPingTimer :: keepalive %d (seconds)', this.options.keepalive)

  if (!this.pingTimer && this.options.keepalive) {
    this.pingResp = true
    this.pingTimer = reInterval(() => {
      checkPing()
    }, this.options.keepalive * 1000)
  }
}

export async function shiftPingInterval () {
  if (this.pingTimer && this.options.keepalive && this.options.reschedulePings) {
    this.pingTimer.reschedule(this.options.keepalive * 1000)
  }
}

function checkPing () {
  if (this.pingResp) {
    this.pingResp = false
    this._sendPacket({ cmd: 'pingreq' })
  } else {
    // do a forced cleanup since socket will be in bad shape
    this._cleanUp(true)
  }
}