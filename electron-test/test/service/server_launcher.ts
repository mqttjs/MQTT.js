import type { Services } from '@wdio/types'
import type { IClientOptions } from '../../../src'
import serverBuilder from '../helper/server_helpers_for_client_tests'


export default class ServerLauncher implements Services.ServiceInstance {

    private _server: ReturnType<typeof serverBuilder> | undefined
    private _mqttOptions: IClientOptions

    constructor() {
        this._mqttOptions = {
            protocol: 'mqtt',
            port: 10400,
        }
    }

    async onPrepare(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this._server = serverBuilder(this._mqttOptions.protocol)

            this._server.once('listening', () => {
                resolve()
            })
            .once('error', (err) => {
                reject(err)
            })

            this._server.listen(this._mqttOptions.port)
        })
    }

    onComplete(): void {
        if (this._server?.listening) {
            this._server.close()
        }
    }

}