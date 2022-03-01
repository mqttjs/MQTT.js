# Connecting To Server

Translations: N/A

## Recommended Secure Transports

MQTT.js supports MQTT over TCP, however it is only recommended for prototyping and testing purposes. For all other uses, it is recommended to use a secure transport layer like TLS or QUIC. 

Though it is possible to create a custom transport and provide it to the client, the client also offers some default secure transports:

- MQTT over TLS
- MQTT over Websockets over TLS

To clarify the user experience, MQTT accepts the brokerURL as a WHATWG URL type, which is cross-compatible over supported Node.js verions or Browser environments. 

## Promise / Callback support

MQTT.js no longer supports callbacks for it's API. It is implemented with promises as a first-class API surface. **NOTE**: If there is significant community feedback in favor of adding a callback API, that can be considered.

## Async function support

MQTT.js comes with built-in support for [async functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function).

## Observable support

TODO: Should we support observables?

MQTT.js could come with built-in support for [observables](https://github.com/zenparsing/es-observable).
