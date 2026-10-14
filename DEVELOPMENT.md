# MQTTjs Development

This document aims to help you get started with developing MQTT.js.

## Release Process

In order to create a new release you have two options:

1. Locally run `npm run release` and follow the interactive CLI
2. Manually trigger the GitHub Action `Release-it: Create a new release on demand` workflow specifying the type of release you want to create

## Tests

To run the tests, you can use the following command:

```sh
npm test
```

This runs the Node tests (`npm run test:node`). Browser tests run separately with `npm run test:browser`.

### Running specific tests

For example, you can run `node -r esbuild-register --test test/node/keepaliveManager.ts`

### Browser

Browser tests use [`wtr`](https://modern-web.dev/docs/test-runner/overview/) as the test runner. To build browser bundle using [esbuild](https://esbuild.github.io/) and run browser tests, you can use the following command:

```sh
npm run test:browser
```

The configuration file is [web-test-runner.config.mjs](./web-test-runner.config.mjs). It starts a local broker using [aedes-cli](https://github.com/moscajs/aedes-cli) with `tcp`, `tls`, `ws` and `wss` listeners and then runs the tests with Playwright in 3 browser engines: `chromium`, `firefox` and `webkit`.

The tests are located in the `test/browser` directory and there is also a Web Worker test, whose worker script is `test/browser/worker.js`.

When developing/debugging tests it's useful to run the tests in a single browser, for example:

```sh
npx wtr --manual --open
```

This will open the browser on the URL printed by `wtr` and lets you choose the test to run by clicking on the link with the test name. By opening the DevTools you will be able to see the tests output and put debugger in both worker and main tests files.

Be aware that tests will use the bundled version of the library, so you need to run `npm run build` before running the tests. If you need to debug issues in the code it could be useful to enable source maps when building, in order to do this just set `sourcemap: true` in [esbuild.js](./esbuild.js) file and run `npm run build`.

### Node

For NodeJS tests we use the NodeJS [Test Runner](https://nodejs.org/api/test.html). To run the tests, you can use the following command:

```sh
npm run test:node
```

The tests are located in the `test/node` directory. `npm run unit-test:node` runs every `test/node/*.ts` file with `--test-concurrency 4` and the `spec` and `junit` (`junit.xml`) reporters.

When developing/debugging tests it's useful to run the tests for a single file/test, for example:

```sh
node -r esbuild-register --test --inspect test/node/client.ts
```

If you want to run tests using a filter, you can use the `--test-name-pattern` flag:

```sh
node -r esbuild-register --test --test-name-pattern="should resend in-flight QoS" --inspect test/node/client.ts
```

You can also run tests in watch mode using the `--watch` flag.

## Lint

You can run and automatically fix linting issues with

```sh
npm run lint-fix
```

