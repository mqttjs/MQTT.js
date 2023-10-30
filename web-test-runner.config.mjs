// Docs: https://modern-web.dev/docs/test-runner/cli-and-configuration/
// import { playwrightLauncher } from '@web/test-runner-playwright';
import { start } from './test/browser/server.js'

start(4000, () => {
    console.log('server started')
})

export default {
    // https://modern-web.dev/docs/test-runner/browser-launchers/playwright/#testing-multiple-browsers
    // Requires: @web/test-runner-playwright
    // browsers: [
    //     playwrightLauncher({ product: 'chromium' }),
    //     playwrightLauncher({ product: 'firefox' }),
    //     // playwrightLauncher({ product: 'webkit' }),
    // ],
    // playwright: true,
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