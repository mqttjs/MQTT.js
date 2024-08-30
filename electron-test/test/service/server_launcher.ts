import type { Services } from '@wdio/types'
import { resolve as pathResolve } from 'path'
const { start } = require('aedes-cli')


export default class ServerLauncher implements Services.ServiceInstance {

    #aedesBroker: any

    constructor() {
        this.#aedesBroker = null
    }

    async onPrepare(): Promise<void> {
        const keyPath = pathResolve(__dirname, '../../../test/certs/server-key.pem')
        const certPath = pathResolve(__dirname, '../../../test/certs/server-cert.pem')

        this.#aedesBroker = await start({
            protos: ['tcp', 'tls'],
            port: 1883,
            tlsPort: 8883,
            key: keyPath,
            cert: certPath,
            verbose: true,
            stats: false,
        })
    }

    async onComplete(): Promise<void> {
        if (!this.#aedesBroker?.servers) {
            return
        }

        for (const server of this.#aedesBroker.servers) {
            if (server.listening) {
                await new Promise<void>((resolve, reject) => {
                    server.close((err: any) => {
                        if (err)
                            reject(err)
                        else
                            resolve()
                    })
                })
            }
        }
    }
}