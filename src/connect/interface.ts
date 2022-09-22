'use strict';

import { _IDuplex } from 'readable-stream';
import MqttClient from '../client';
import { MqttClientOptions } from '../options';

export type StreamBuilderFunction = (client: MqttClient, opts: MqttClientOptions) => _IDuplex;
