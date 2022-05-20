import { ConnectOptions } from "./connectOptions.js";
import { URL } from "node:url";
import { defaultId } from "../defaultClientId.js";

/**
 * ClientOptions extends ConnectOptions to ensure that all required
 * options for the client are provided once defaults are merged in.
 */
export interface ClientOptions extends ConnectOptions {
  brokerUrl: URL | string;
  protocolVersion: 4 | 5;
  clientId: string;
  clean: boolean;
  keepalive: number;
}

export function generateDefaultClientOptions(): ClientOptions {
  return {
    brokerUrl: new URL("mqtt://localhost:1883"),
    protocolVersion: 4,
    clientId: defaultId(),
    clean: true,
    keepalive: 60,
  }
}