// Return Codes are part of the MQTT 3.1.1 specification
export const ReturnCodes = {
  'connack': {
    0x00: 'Connection Accepted',
    0x01: 'Connection Refused: unacceptable protocol version',
    0x02: 'Connection Refused: identifier rejected',
    0x03: 'Connection Refused: server unavailable',
    0x04: 'Connection Refused: bad user name or password',
    0x05: 'Connection Refused: not authorized',
  },
  'suback': {
    0x00: 'Success: Maximum QoS 0',
    0x01: 'Success: Maximum QoS 1',
    0x02: 'Success: Maximum QoS 2',
    0x80: 'Failure'
  }
}