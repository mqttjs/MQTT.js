// Docs: https://modern-web.dev/docs/test-runner/cli-and-configuration/
import { playwrightLauncher } from '@web/test-runner-playwright';
import { start } from 'aedes-cli'

await start({
    protos: ['tcp', 'tls', 'ws', 'wss'],
    wsPort: 4000,
    wssPort: 4443,
    key: './test/certs/server-key.pem',
    cert: './test/certs/server-cert.pem',
})

console.log('Broker setup done')

export default {
    // https://modern-web.dev/docs/test-runner/browser-launchers/playwright/#testing-multiple-browsers
    // Requires: @web/test-runner-playwright
    browsers: [
        playwrightLauncher({ product: 'chromium' }),
        playwrightLauncher({ product: 'firefox' }),
        // playwrightLauncher({ product: 'webkit' }),
    ],
    playwright: true,
    concurrency: 10,
    files: ['./test/browser/test.js'],
    nodeResove: true,
    // manual: true,
    // open: true,
    // rootDir: path.resolve(__dirname)
    testRunnerHtml: (testFrameworkImport) =>
        `<html>
        <body>
            <script src="dist/mqtt.js"></script>
            <script type="module" src="${testFrameworkImport}"></script>
        </body>
    </html>`
};