# Agent guidelines

Applies to all code changes and reviews. Commands: [DEVELOPMENT.md](DEVELOPMENT.md).
Contribution rules: [CONTRIBUTING.md](CONTRIBUTING.md).

## Protocol behavior: evidence decides

Decide wire behavior (packet handling, reason codes, session state, QoS flows,
flow control, topic aliases, keepalive, reconnect, packet size limits) in this
order. Do not ask the maintainer when it settles the question.

1. **Spec.** Quote the normative statement and its ID, e.g.
   `[MQTT-4.7.3-1] All Topic Names and Topic Filters MUST be at least one character long.`
   - [MQTT 5.0](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)
   - [MQTT 3.1.1](https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html)
   - 3.1 (`protocolId: 'MQIsdp'`, `protocolVersion: 3`) must keep working.
2. **Other clients.** Read the source, link the file and line. Check at least two:
   `eclipse-paho/paho.mqtt.java`, `eclipse-paho/paho.mqtt.python`,
   `eclipse-paho/paho.mqtt.c`, `eclipse-paho/paho.mqtt.golang`,
   `hivemq/hivemq-mqtt-client`, `bytebeamio/rumqtt`,
   `eclipse-mosquitto/mosquitto` (`lib/`).
3. **Decide.** Clear spec → follow it. Spec silent or MAY/SHOULD and clients
   agree → follow the clients.

Ask the maintainer only when the spec is ambiguous **and** clients disagree.
Use this shape:

> Spec: [ID] says X, silent on Y.
> - Client A: P (link). Client B: Q (link). Client C: P (link).
> - Recommend: P, because ...

## Performance: hot paths must be benchmarked

Any change to the publish or receive path MUST include a benchmark against
`main`. That covers `publish`, `_sendPacket`, `outgoingStore`, the
`parser.on('packet')` loop in `src/lib/client.ts`, and `src/lib/handlers/`.

- Same machine, same local broker (`npx aedes start`), branch vs `main`.
- Measure messages/s for publish and receive at QoS 0, 1 and 2.
- Put both numbers and the method (message count, payload size) in the PR.
- A drop is a finding unless the PR explains why it is worth it.

## Reviews

- A protocol finding cites the spec ID. No citation, no finding.
- Flag any departure from the spec or from other clients, even if tests pass.
- A hot-path change with no benchmark is a finding.
- Don't grow scope across review rounds. Extra hardening goes in a follow-up issue.
