interface AuthProperties {
  authenticationMethod: string,
  authenticationData: Buffer,
  reasonString: string,
  userProperties: {[x: string]: unknown}
}

export async function handleAuth (direction: 'toServer' | 'fromServer', reasonCode: number, props: AuthProperties) {
  const packet = {
    cmd: 'auth',
    reasonCode: reasonCode, // MQTT 5.0 code
    properties: { // properties MQTT 5.0
       authenticationMethod: props.authenticationMethod,
       authenticationData: props.authenticationData,
       reasonString: props.reasonString,
       userProperties: props.userProperties
    }
  }
}

/**
 * Authentication in MQTT v5
 * 
 * AUTH messages can be used multiple times by the server and the client.
 * Two message properties are at the heart of the authentication flow:
 *   - BYTE 21: Authentication Method
 *   - BYTE 22: Authentication Data
 * 
 * These properties are set on every message that takes part in the enhanced authentication flow.
 * 
 * Authentication Method
 * The Authentication Method is used to choose and describe a way of authentication
 * that the client and server have agreed upon. For example, SCRAM-SHA-1, GS2-KRB5, etc.
 * The Authentication Method gives meaning to the data that is exchanged during the
 * enhanced authentication and must not change.
 * 
 * Authentication Data
 * Authentication Data is binary information. This data is usually used to transfer
 * multiple iterations of encryped secrets or protocol steps. The content is highly
 * dependent on the specific mechanism that is used in the enhanced authentication
 * and is application-specific.
 * 
 *  Format in MQTT-Packet for Auth:
 * {
 *  cmd: 'auth',
 *  reasonCode: 0, // MQTT 5.0 code
 *  properties: { // properties MQTT 5.0
 *     authenticationMethod: 'test',
 *     authenticationData: Buffer.from([0, 1, 2, 3]),
 *     reasonString: 'test',
 *     userProperties: {
 *       'test': 'test'
 *     }
 *  }
 * }
 */