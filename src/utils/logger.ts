import {pino} from "pino"


export const logger = pino({
  name: 'app-name',
  level: 'debug',
  customLevels: {
    test: 35
  },
  prettyPrint: process.env["NODE_ENV"] !== "production",
})