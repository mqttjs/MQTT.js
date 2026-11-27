# Agent and review guidelines

These rules apply to every code review and every design decision in this repo,
whether the reviewer is a person or an agent.

## Protocol behavior: the spec decides, not the maintainer

Any question about how the client should behave on the wire (packet handling,
CONNACK/DISCONNECT reason codes, session state, QoS flows, flow control, topic
aliases, keepalive, reconnect and resubscribe, limits like Receive Maximum or
Maximum Packet Size) is settled by evidence, in this order:

1. **The MQTT specification.** Quote the normative statement and its ID.
   - MQTT 5.0: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html
   - MQTT 3.1.1: https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html
   - MQTT.js also supports 3.1 (`protocolVersion: 3`); check that a change
     does not break it.
   Example: "[MQTT-4.7.3-1] All Topic Names and Topic Filters MUST be at
   least one character long."
2. **What other mature open-source clients do.** Read their source, not their
   README. Link the file and line. Check at least two or three of:
   - Eclipse Paho Java (`eclipse-paho/paho.mqtt.java`)
   - Eclipse Paho Python (`eclipse-paho/paho.mqtt.python`)
   - Eclipse Paho C (`eclipse-paho/paho.mqtt.c`)
   - Eclipse Paho Go (`eclipse-paho/paho.mqtt.golang`, `eclipse-paho/paho.golang`)
   - HiveMQ MQTT Client (`hivemq/hivemq-mqtt-client`)
   - rumqttc (`bytebeamio/rumqtt`)
   - Mosquitto client library (`eclipse/mosquitto`, `lib/`)
3. **Then decide.** If the spec is clear, follow it. If the spec is silent or
   says MAY/SHOULD and the clients agree, follow the clients. Do not ask the
   maintainer to pick an option that the spec or prior art already settles.

### When to ask the maintainer

Only when the evidence leaves a real choice:

- the spec is ambiguous or silent, **and**
- the other clients disagree with each other (or with the spec).

When you do ask, show the evidence: the spec text, what each client does with
links, and the option you recommend. One line per client is enough.

Shape of the question:

> Spec: [section / statement ID] says X, but is silent on Y.
> - Client A: does P (link to source line).
> - Client B: does Q (link).
> - Client C: does P (link).
> Recommend: P, because ...

## Review findings

- A finding about protocol behavior must cite the spec section or statement
  ID. "Probably not allowed" without a citation is not a finding.
- If the change departs from the spec or from what other clients do, the
  review must say so, even when tests pass.
- Do not grow the scope of a PR across review rounds. Hardening ideas that go
  beyond the reported problem become follow-up issues, not new requests.
- Changes on the publish path (`publish`, `_sendPacket`, `outgoingStore`)
  need a benchmark against `main` (see `benchmarks/`).
