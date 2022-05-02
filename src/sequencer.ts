import { logger } from './util/logger.js';
import { IConnectPacket, IConnackPacket, Packet, IDisconnectPacket } from 'mqtt-packet';
import { NumberAllocator } from 'number-allocator'
import { ReturnCodes } from './util/returnCodes.js';
import { ReasonCodes } from './util/reasonCodes.js';
import { ClientOptions } from './interface/clientOptions.js'

type SequenceId = number | 'connect' | 'pingreq' | 'disconnect';
type InFlightSequenceMap = Map<SequenceId, SequenceMachine>
type SendPacketFunction = (packet: Packet) => Promise<void>
type DoneFunction = (finalPacket: Packet | null, err?: Error) => void
type SequenceMachineConstructor = new (
  initialPacket: Packet,
  sendPacketFunction: SendPacketFunction,
  doneFunction: DoneFunction
) => SequenceMachine

const notImplementedErrorMessage = 'Not implemented';
const operationStartedErrorMessage = 'Operation can only be started once.';

export class MqttPacketSequencer {
  private _sendPacketFunction: (packet: Packet) => Promise<void>;
  private _inFlightSequences: InFlightSequenceMap = new Map();
  private _numberAllocator: NumberAllocator = new NumberAllocator(1, 65535);
  private _clientOptions: ClientOptions;

  constructor(clientOptions: ClientOptions, sendPacketFunction: SendPacketFunction) {
    this._clientOptions = clientOptions;
    this._sendPacketFunction = sendPacketFunction;
  }

  async runSequence(initialPacket: Packet) {
    let sequenceMachineConstructor: SequenceMachineConstructor;
    let sequenceId: SequenceId;

    switch (initialPacket.cmd) {      
      /* FALLTHROUGH */
      case 'pingreq':
      case 'subscribe':
      case 'unsubscribe':
      case 'publish':
        throw new Error(notImplementedErrorMessage);

      case 'connect':
        // TODO: enhanced authentication
        sequenceId = 'connect';
        sequenceMachineConstructor = BasicConnect as SequenceMachineConstructor;
        break;
      case 'disconnect':
        sequenceId = 'disconnect';
        sequenceMachineConstructor = Disconnect as SequenceMachineConstructor;
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
        throw new Error(notImplementedErrorMessage);

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

abstract class SequenceMachine {
  protected _sendPacketFunction: SendPacketFunction;
  protected _done: DoneFunction;
  protected _initialPacket: Packet;
  protected _clientOptions: ClientOptions;

  constructor(initialPacket: Packet, clientOptions: ClientOptions, sendPacketFunction: SendPacketFunction, done: DoneFunction) {
    this._initialPacket = initialPacket;
    this._sendPacketFunction = sendPacketFunction;
    this._done = done;
    this._clientOptions = clientOptions
  }

  abstract start(): void;
  abstract handleIncomingPacket(packet: Packet): void;
  abstract cancel(error?: Error): void;
}

enum BasicConnectState {
  New,
  AwaitingConnack,
  Done,
  Cancelled,
  Failed
}

class BasicConnect extends SequenceMachine {
  /**TODO:
   * - handle keepalive
   * - handle session present, expiry
   * - max QoS
   * - max packet size
   * - assigned client id
   * - retained messages
   * - topic alias max
   * - reason string
   * - features available: wildcard subscription, subscription identifier, shared subscriptions
   * - response information
   */
  private _state = BasicConnectState.New;

  constructor(initialPacket: IConnectPacket, clientOptions: ClientOptions, sendPacketFunction: SendPacketFunction, done: DoneFunction) {
    super(initialPacket, clientOptions, sendPacketFunction, done);
    if (initialPacket.cmd !== 'connect') {
      throw new Error('BasicConnect must have a connect packet as the initial packet.');
    }
    if (initialPacket.protocolId !== 'MQTT') {
      throw new Error('BasicConnect must have a MQTT protocol ID.');
    }
    if (initialPacket.protocolVersion !== clientOptions.protocolVersion) {
      throw new Error('Protocol version in connect packet must match client options.');
    }
    if (!initialPacket.clean) {
      throw new Error('Connecting with an existing session is not supported yet.');
    }
  }

  start() {
    if (this._state !== BasicConnectState.New) {
      throw new Error(operationStartedErrorMessage);
    }
    this._sendConnect();
  }

  handleIncomingPacket(packet: IConnackPacket) {
    if (packet.cmd !== 'connack') {
      this._finishWithFailure(new Error(`Expected connack, but received ${packet.cmd}`))
      return;
    }
    this._clientOptions.protocolVersion === 4 ? this._handleMqtt4Connack(packet) : this._handleMqtt5Connack(packet);
  }

  cancel(error?: Error) {
    this._state = error ? BasicConnectState.Failed : BasicConnectState.Cancelled;
    this._done(null, error);
  }

  private _finishWithFailure(error: Error) {
    this._state = BasicConnectState.Failed;
    this._done(null, error);
  }

  private _finishWithSuccess(finalPacket: IConnackPacket) {
    this._state = BasicConnectState.Done;
    this._done(finalPacket);
  }

  private _sendConnect() {
    /* TODO: Allow CONNACK timeout to be configurable */
    this._state = BasicConnectState.AwaitingConnack;
    this._sendPacketFunction(this._initialPacket)
      .then(() => setTimeout(this._finishWithFailure.bind(this), 60 * 1000, new Error('Timed out waiting for CONNACK')))
      .catch(this._finishWithFailure.bind(this));
  }

  private _handleMqtt4Connack(packet: IConnackPacket) {
    /* TODO: check server sent a valid packet */
    const returnCode = packet.returnCode as keyof typeof ReturnCodes.connack
    const returnCodeMessage = ReturnCodes.connack[returnCode];
    if (returnCodeMessage === undefined) {
      this._finishWithFailure(new Error('Server sent invalid CONNACK return code'));
      return;
    }
    if (returnCode !== 0) {
      this._finishWithFailure(new Error(`Server returned error: ${returnCodeMessage}`));
      return;
    }
    this._finishWithSuccess(packet);
  }

  private _handleMqtt5Connack(packet: IConnackPacket) {
    /* TODO: check server sent a valid packet */
    const reasonCode = packet.reasonCode as keyof typeof ReasonCodes.connack
    const reasonCodeMessage = ReasonCodes.connack[reasonCode];
    if (reasonCodeMessage === undefined) {
      this._finishWithFailure(new Error('Server sent invalid CONNACK reason code'));
      return;
    }
    if (reasonCode >= 0x80) {
      this._finishWithFailure(new Error(`Server returned error: ${reasonCodeMessage}`));
      return;
    }
    this._finishWithSuccess(packet);
  }
}

enum ClientDisconnectState {
  New,
  Done,
  Failed
}

class ClientDisconnect extends SequenceMachine {
  private _state = ClientDisconnectState.New;

  constructor(initialPacket: IDisconnectPacket, clientOptions: ClientOptions, sendPacketFunction: SendPacketFunction, done: DoneFunction) {
    super(initialPacket, clientOptions, sendPacketFunction, done);
    if (initialPacket.cmd !== 'disconnect') {
      throw new Error('ClientDisconnect must have a disconnect packet as the initial packet.');
    }
    /* err if MQTT v4 and reason code */
    /* err if MQTT v4 and properties */
    /* err if MQTT v5 and invalid client reason code */
  }

  start() {
    if (this._state !== ClientDisconnectState.New) {
      throw new Error(operationStartedErrorMessage);
    }
  }
}