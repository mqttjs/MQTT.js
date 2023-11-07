// Docs: https://modern-web.dev/docs/test-runner/cli-and-configuration/
import { playwrightLauncher } from '@web/test-runner-playwright';
import { start } from 'aedes-cli'

const wsPort = 4000
const wssPort = 4443

await start({
    protos: ['tcp', 'tls', 'ws', 'wss'],
    wsPort,
    wssPort,
    key: './test/certs/server-key.pem',
    cert: './test/certs/server-cert.pem',
})

console.log('Broker setup done')

/** @type { import('@web/test-runner-playwright').PlaywrightLauncher[] } */
const browsers = ['chromium', 'firefox', 'webkit'].map(product => playwrightLauncher({
    product,
    createBrowserContext: ({ browser, config }) => {

        // ignore HTTPS errors
        const context = browser.newContext({
            ignoreHTTPSErrors: true,
            extraHTTPHeaders: {
                'x-forwarded-proto': 'https',
            },
        })
        return context
    },
    launchOptions: { headless: true, devtools: false }
}))

/**
 * @type { import('@web/test-runner').TestRunnerConfig }
 */
export default {
    // https://modern-web.dev/docs/test-runner/browser-launchers/playwright/#testing-multiple-browsers
    // Requires: @web/test-runner-playwright
    browsers,
    playwright: true,
    concurrency: 1,
    files: ['./test/browser/test.js'],
    nodeResolve: true,
    testFramework: {
        config: {
            timeout: '10000',
        },
    },
    // manual: true,
    // open: true,
    // rootDir: path.resolve(__dirname)
    // http2: true,
    // protocol: 'https:',
    // sslCert: './test/certs/server-cert.pem',
    // sslKey: './test/certs/server-key.pem',
    testRunnerHtml: (testFrameworkImport) =>
        `<html>
        <body>
            <script src="dist/mqtt.js"></script>
            <script>
                window.wsPort = ${wsPort};
                window.wssPort = ${wssPort};
            </script>
            <script type="module" src="${testFrameworkImport}"></script>
        </body>
    </html>`
};