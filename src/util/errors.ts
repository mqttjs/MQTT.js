export const ReasonCodeErrors = {
  4: {
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
    },
    // 0: '',
    // 1: 'Unacceptable protocol version',
    // 2: 'Identifier rejected',
    // 3: 'Server unavailable',
    // 4: 'Bad username or password',
    // 5: 'Not authorized',
    // 16: 'No matching subscribers',
    // 17: 'No subscription existed',
    // 128: 'Unspecified error',
    // 129: 'Malformed Packet',
    // 130: 'Protocol Error',
    // 131: 'Implementation specific error',
    // 132: 'Unsupported Protocol Version',
    // 133: 'Client Identifier not valid',
    // 134: 'Bad User Name or Password',
    // 135: 'Not authorized',
    // 136: 'Server unavailable',
    // 137: 'Server busy',
    // 138: 'Banned',
    // 139: 'Server shutting down',
    // 140: 'Bad authentication method',
    // 141: 'Keep Alive timeout',
    // 142: 'Session taken over',
    // 143: 'Topic Filter invalid',
    // 144: 'Topic Name invalid',
    // 145: 'Packet identifier in use',
    // 146: 'Packet Identifier not found',
    // 147: 'Receive Maximum exceeded',
    // 148: 'Topic Alias invalid',
    // 149: 'Packet too large',
    // 150: 'Message rate too high',
    // 151: 'Quota exceeded',
    // 152: 'Administrative action',
    // 153: 'Payload format invalid',
    // 154: 'Retain not supported',
    // 155: 'QoS not supported',
    // 156: 'Use another server',
    // 157: 'Server moved',
    // 158: 'Shared Subscriptions not supported',
    // 159: 'Connection rate exceeded',
    // 160: 'Maximum connect time',
    // 161: 'Subscription Identifiers not supported',
    // 162: 'Wildcard Subscriptions not supported',
  },
  5 : {
    'pubrec': {
      0x00: 'Success: The message is accepted. Publication of the QoS 2 message proceeds.',
      0x10: 'No matching subscribers: The message is accepted but there are no subscribers. This is sent only by the Server. If the Server knows that there are no matching subscribers, it MAY use this Reason Code instead of 0x00 (Success).'
    }

  }
};
