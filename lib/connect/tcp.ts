'use strict'
import * as net from 'net'
import {MqttClient, ClientOptions} from '../client'

/*
  variables port and host can be removed since
  you have all required information in opts object
*/
function buildBuilder (client: MqttClient, opts: ClientOptions) {
  let port, host
  opts.port = opts.port || 1883
  opts.hostname = opts.hostname || opts.host || 'localhost'

  port = opts.port
  host = opts.hostname

  return net.createConnection(+port, host)
}

export = buildBuilder
