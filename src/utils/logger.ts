import {pino} from "pino"


export const logger = pino({
  name: 'mqtt',
  level: 'debug',
  customLevels: {
    test: 35
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
})