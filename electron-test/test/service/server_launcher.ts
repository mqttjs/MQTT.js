import type { Services } from '@wdio/types'
import { resolve as pathResolve } from 'path'
import { start } from 'aedes-cli'


export default class ServerLauncher implements Services.ServiceInstance {

    constructor() { }

    async onPrepare(): Promise<void> {
        const keyPath = pathResolve(__dirname, '../../../test/certs/server-key.pem')
        const certPath = pathResolve(__dirname, '../../../test/certs/server-cert.pem')

        await start({
            protos: ['tcp', 'tls'],
            port: 1883,
            tlsPort: 8883,
            key: keyPath,
            cert: certPath,
            verbose: true,
            stats: false,
        })
    }

}