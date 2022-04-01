import { logger } from './util/logger.js';
import { Packet } from 'mqtt-packet';
import { NumberAllocator } from 'number-allocator'

type SequenceId = number | 'connect' | 'pingreq';
type InFlightSequenceMap = Map<SequenceId, SequenceMachine>
type SendPacketFunction = (packet: Packet) => Promise<void>
type DoneFunction = (err?: Error) => void
type SequenceMachineConstructor = new (
  initialPacket: Packet,
  sendPacketFunction: SendPacketFunction,
  doneFunction: DoneFunction
) => SequenceMachine

const notImplementedError = new Error('Not implemented');

// TODO: Change these value to be user-configurable.
const retryIntervalInMs = 30 * 1000;
const maxRetryCount = 5;

export class MqttPacketSequencer {
  _sendPacketFunction: (packet: Packet) => Promise<void>;
  _inFlightSequences: InFlightSequenceMap = new Map();
  _numberAllocator: NumberAllocator = new NumberAllocator(1, 65535);

  constructor(sendPacketFunction: (packet: Packet) => Promise<void>) {
    this._sendPacketFunction = sendPacketFunction;
  }

  async runSequence(initialPacket: Packet) {
    let sequenceMachineConstructor: SequenceMachineConstructor;
    let sequenceId: SequenceId;
    const invalidMessageIdError = new Error('Message ID must be assigned by the sequencer');
    const noMoreMessageIdsError = new Error('No more message IDs available');

    switch (initialPacket.cmd) {      
      /* FALLTHROUGH */
      case 'pingreq':
      case 'subscribe':
      case 'unsubscribe':
        throw notImplementedError;

      case 'connect':
        // TODO: enhanced authentication
        sequenceId = 'connect';
        sequenceMachineConstructor = ConnectSequenceMachine;
        break;
      case 'disconnect':
        // fire-and-forget
        await this._sendPacketFunction(initialPacket);
        return;
      case 'publish':
        if (initialPacket.qos === 0) {
          // fire-and-forget
          await this._sendPacketFunction(initialPacket);
          return;
        }
        // TODO: non-zero QoS
        if (initialPacket.messageId) {
          throw invalidMessageIdError;
        }
        if (this._numberAllocator.firstVacant() === null) {
          throw noMoreMessageIdsError;
        }
        // Cast is safe because we checked firstVacant() above.
        sequenceId = this._numberAllocator.alloc() as number;
        initialPacket.messageId = sequenceId;
        switch (initialPacket.qos) {
          case 1:
            sequenceMachineConstructor = PublishQos1;
            break;
          case 2:
            sequenceMachineConstructor = PublishQos2;
            break;
          default:
            throw new Error('Invalid QoS');
        }
        break;
      
      default:
        throw new Error('Invalid initial control packet type');
    }
    if (this._inFlightSequences.has(sequenceId)) {
      throw new Error('Sequence with matching ID already in flight');
    }

    try {
      await new Promise<void>((resolve, reject) => {
        // You're only going to have an inflight sequence if you are waiting for a response from the server. So every case except QoS 0 Publish, and Disconnect.
        this._inFlightSequences.set(sequenceId, new sequenceMachineConstructor(
          initialPacket,
          this._sendPacketFunction,
          (err?: Error) => { err ? reject(err) : resolve() }
        ));
      });
    } finally {
      this._inFlightSequences.delete(sequenceId);
    }
  }

  handleIncomingPacket(packet: Packet) {
    let sequenceMachine: SequenceMachine | undefined;
    switch (packet.cmd) {
      /* FALLTHROUGH */
      case 'auth':
      case 'disconnect':
      case 'pingresp':
      case 'puback':
      case 'pubcomp':
      case 'publish':
      case 'pubrel':
      case 'pubrec':
      case 'suback':
      case 'unsuback':
        throw notImplementedError;

      case 'connack':
        sequenceMachine = this._inFlightSequences.get('connect');
        break;

      default:
        throw new Error('Invalid incoming control packet type');
    }
    if (!sequenceMachine) {
      throw new Error('No matching sequence machine for incoming packet');
    }
    sequenceMachine.handleIncomingPacket(packet);
  }
}

// TODO: have better error messages on all SequenceMachine implementations.
abstract class SequenceMachine {
  sendPacketFunction: SendPacketFunction;
  done: DoneFunction;
  initialPacket: Packet;
  // TODO: investigate whether it's a problem that every sequence machine has a timer.
  timeout: NodeJS.Timeout | null = null;

  constructor(initialPacket: Packet, sendPacketFunction: SendPacketFunction, done: DoneFunction) {
    this.initialPacket = initialPacket;
    this.sendPacketFunction = sendPacketFunction;
    this.done = done;
  }

  abstract start(): void;
  abstract handleIncomingPacket(packet: Packet): void;
  abstract cancel(): void;

  _setTimer(callback: () => void, timeInMs: number): void {
    this._clearTimer();
    this.timeout = setTimeout(callback, timeInMs);
  }

  _clearTimer(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

enum ConnectState {
  New,
  AwaitingConnack,
  Done,
  Failed
}

class Connect extends SequenceMachine {
  state = ConnectState.New;
  sendConnectCount = 0;

  start(): void {
    this._sendConnect();
  }

  async _sendConnect() {
    if (++this.sendConnectCount > maxRetryCount) {
      this._clearTimer();
      this.state = ConnectState.Failed;
      this.done(new Error('Max retry count exceeded'));
      return;      
    }
    this.state = ConnectState.AwaitingConnack;
    try {
      await this.sendPacketFunction(this.initialPacket);

    } catch (err) {
      this._clearTimer();
      this.state = ConnectState.Failed;
      this.done(err as Error);
    }
  }
}

// TODO: do we want a state for Cancelled?
enum Qos1State {
  New,
  WaitingForPubAck,
  Done,
  Failed,
}

class PublishQos1 extends SequenceMachine {
  state = Qos1State.New;
  sendPublishCount = 0;

  start(): void {
    this._sendPublish();
  }

  _sendPublish() {
    this.sendPublishCount++;
    if (this.sendPublishCount > maxPublishCount) {
      this._clearTimer();
      this.state = Qos1State.Failed;
      this.done(new Error());
    } else {
      // Set the state and start the timer before you send anything, just
      // in case the ack comes back before sendPacketFunction returns.
      this.state = Qos1State.WaitingForPubAck;
      try {
        this.sendPacketFunction('publish', this.message);
        this._setTimer(this._sendPublish.bind(this), pubAckInterval);
      } catch (e) {
        this.state = Qos1State.Failed;
        this.done(e as Error);
      }
    }
  }

  handleIncomingPacket(packetType: PacketType, packet: Packet): void {
    packet;
    if (packetType == 'puback' && this.state == Qos1State.WaitingForPubAck) {
      this._clearTimer();
      this.state = Qos1State.Done;
      this.done();
    } else {
      logger.info('blah');
    }
  }

  cancel() {
    this._clearTimer();
    if (this.state in [Qos1State.New, Qos1State.WaitingForPubAck]) {
      this.done(new Error());
      this.state = Qos1State.Failed;
    }
  }
}

enum Qos2State {
  New,
  WaitingForPubRec,
  WaitingForPubComp,
  Done,
  Failed,
}

class PublishQos2 extends SequenceMachine {
  state = Qos2State.New;
  sendPublishCount = 0;
  sendPubRelCount = 0;

  start(): void {
    this._sendPublish();
  }

  _sendPublish() {
    this._clearTimer();
    this.sendPublishCount++;
    if (this.sendPublishCount > maxPublishCount) {
      this.state = Qos2State.Failed;
      this.done(new Error(''));
    } else {
      // Set the state before you send anything, just
      // in case the ack comes back before sendPacketFunction returns.
      this.state == Qos2State.WaitingForPubRec;
      try {
        this.sendPacketFunction('publish', this.message);
        this._setTimer(this._sendPublish.bind(this), pubAckInterval);
      } catch (e) {
        this.state = Qos2State.Failed;
        this.done(e as Error);
      }
    }
  }

  _sendPubRel() {
    this._clearTimer();
    this.sendPubRelCount++;
    if (this.sendPubRelCount > maxPublishCount) {
      this.state = Qos2State.Failed;
      this.done(new Error());
    } else {
      // Set the state before you send anything, just
      // in case the ack comes back before sendPacketFunction returns.
      this.state == Qos2State.WaitingForPubComp;
      try {
        this.sendPacketFunction('pubrel', this.message);
        this._setTimer(this._sendPubRel.bind(this), pubAckInterval);
      } catch (e) {
        this.state = Qos2State.Failed;
        this.done(e as Error);
      }
    }
  }

  handleIncomingPacket(packetType: PacketType, packet: Packet) {
    packet;
    if (packetType == 'pubrec') {
      if (this.state in [Qos2State.WaitingForPubRec, Qos2State.WaitingForPubComp]) {
        // Set the state before you send anything, just
        // in case the ack comes back before sendPacketFunction returns.
        this.state = Qos2State.WaitingForPubComp;
        this._sendPubRel();
      }
    } else if (packetType == 'pubcomp') {
      if (this.state == Qos2State.WaitingForPubComp) {
        this._clearTimer();
        this.state = Qos2State.Done;
        this.done();
      } else {
        logger.info('blah');
      }
    } else {
      logger.info('blah');
    }
  }

  // Note: after this has been proven, we need to flush out
  // the code so we handle any action in any state. Mostly we
  // just log that we're ignoring something, but we also want
  // to check state on the _send methods. If state == done or
  // failed, then we don't send anything -- this just means
  // we had a timer fire or an ack come back late. But if we
  // call _send in some other unexpected state, we might want
  // to except.

  cancel() {
    if (this.state in [Qos2State.New, Qos2State.WaitingForPubRec, Qos2State.WaitingForPubComp]) {
      this.done(new Error());
      this.state = Qos2State.Failed;
    }
  }
}
