// Return Codes are Part of MQTT 3.1.1
export const ReturnCodeErrors = {
'connack': {
    0x00: 'Connection Accepted',
    0x01: 'Connection Refused: unacceptable protocol version',
    0x02: 'Connection Refused: identifier rejected',
    0x03: 'Connection Refused: server unavailable',
    0x04: 'Connection Refused: bad user name or password',
    0x05: 'Connection Refused: not authorized'
},
'suback': {
    0x00: 'Granted QoS 0',
    0x01: 'Granted QoS 1',
    0x02: 'Granted QoS 2',
    0x80: 'Failure'
}
}