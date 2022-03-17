import { logger } from './util/logger.js';

export declare type PacketType = 'publish' | 'puback' | 'pubrec' | 'pubrel' | 'pubcomp';

export declare type SequenceType = 'publish';

export interface Message {
  qos: 0 | 1 | 2;
  cmd: PacketType;
  messageId: number | undefined;
}

export interface Packet {
  messageId: number | undefined;
}

// It's called SendPacketFunction, but it accepts a Message. Maybe we need to rethink this.
// The more I think about this, the more I think it should accept a `Packet` object, and it
// should use `Packet.cmd` instead of accepting a separate `PacketType` parameter.
export type SendPacketFunction = (packetType: PacketType, message: Message) => void;

type InFlightMessageMap = Map<number, SequenceMachine>

// These should be documented so callers can change them. Do we want these to be specific for each packet type (pubRelInterval, maxPubRe, etc)?
/* eslint prefer-const: 0 */
let pubAckInterval = 2000;
let maxPublishCount = 5;

type DoneFunction = (err?: Error) => void;

export class MqttPacketSequencer {
  sendPacketFunction: SendPacketFunction;
  inFlightMessages: InFlightMessageMap = new Map();

  constructor(sendPacketFunction: SendPacketFunction) {
    this.sendPacketFunction = sendPacketFunction;
  }

  _runSequence(sequenceType: SequenceType, message: Message, done: DoneFunction) {
    let sequenceMachine: SequenceMachine;

    switch (sequenceType) {
      case 'publish':
        switch (message.qos) {
          case 0:
            sequenceMachine = new PublishQos0(message, this.sendPacketFunction, done);
            break;
          case 1:
            sequenceMachine = new PublishQos1(message, this.sendPacketFunction, done);
            break;
          case 2:
            sequenceMachine = new PublishQos2(message, this.sendPacketFunction, done);
            break;
        }
        this.inFlightMessages.set(message.messageId as number, sequenceMachine);
      // SUBSCRIBE also goes into the inFlightMesages map. CONNECT maybe goes somewhere else?
    }

    sequenceMachine.start();
  }

  // TODO: Is there an easier way to Promisify this?
  runSequence(sequenceType: SequenceType, message: Message, done?: DoneFunction) {
    if (done) {
      return this._runSequence(sequenceType, message, done);
    } else {
      return new Promise<void>((resolve, reject) => {
        this._runSequence(sequenceType, message, (err: Error | void) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  // `Packet` has an `cmd` value. Should we use this?  Probably?
  handleIncomingPacket(packetType: PacketType, packet: Packet) {
    const sequenceMachine = this.inFlightMessages.get(packet.messageId as number);

    if (sequenceMachine) {
      sequenceMachine.handleIncomingPacket(packetType, packet);
    } else {
      logger.info('blah');
    }
  }
}

abstract class SequenceMachine {
  message: Message;
  sendPacketFunction: SendPacketFunction;
  done: DoneFunction;
  // TODO: investigate whether it's a problem that every sequence machine has a timer.
  timeout: NodeJS.Timeout | number = 0;

  constructor(message: Message, sendPacketFunction: SendPacketFunction, done: DoneFunction) {
    this.message = message;
    this.sendPacketFunction = sendPacketFunction;
    this.done = done;
  }

  abstract start(): void;
  abstract handleIncomingPacket(packetType: PacketType, packet: Packet): void;
  abstract cancel(): void;

  _setTimer(callback: () => void, interval: number): void {
    this._clearTimer();
    this.timeout = setTimeout(callback, interval);
  }

  _clearTimer(): void {
    if (this.timeout) {
      clearTimeout(this.timeout as NodeJS.Timeout);
      this.timeout = 0;
    }
  }
}

enum Qos0State {
  New,
  Done,
  Failed,
}

class PublishQos0 extends SequenceMachine {
  state = Qos0State.New;

  start(): void {
    this._sendPublish();
  }

  _sendPublish() {
    try {
      this.sendPacketFunction('publish', this.message);
      this.state == Qos0State.Done;
      this.done();
    } catch (e: any) {
      this.state = Qos0State.Failed;
      this.done(e);
    }
  }

  handleIncomingPacket(packetType: PacketType, packet: Packet): void {
    packetType;
    packet;
    logger.info('blah');
  }

  cancel() {
    logger.info('blah');
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
      this.state == Qos1State.WaitingForPubAck;
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
      this.done(new Error());
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
