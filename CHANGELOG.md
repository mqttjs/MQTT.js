

## [5.10.1](https://github.com/mqttjs/MQTT.js/compare/v5.10.0...v5.10.1) (2024-08-28)


### Bug Fixes

* **browser:** handle `Blob` payloads ([#1930](https://github.com/mqttjs/MQTT.js/issues/1930)) ([86b7959](https://github.com/mqttjs/MQTT.js/commit/86b795983d86847e1da334fd0d30cbd80f92b540))

# [5.10.0](https://github.com/mqttjs/MQTT.js/compare/v5.9.1...v5.10.0) (2024-08-14)


### Bug Fixes

* **test:** close all open connections in abstract_client test ([#1917](https://github.com/mqttjs/MQTT.js/issues/1917)) ([661c30a](https://github.com/mqttjs/MQTT.js/commit/661c30aecb8d7531fc052a7770519267067840fb))
* **types:** unsubscribe options type ([#1921](https://github.com/mqttjs/MQTT.js/issues/1921)) ([18a357c](https://github.com/mqttjs/MQTT.js/commit/18a357ce98c2e7ae053afefaf7c56a0d3a8e62b7))


### Features

* add `suback` packet to subscribe callback ([#1923](https://github.com/mqttjs/MQTT.js/issues/1923)) ([93f4482](https://github.com/mqttjs/MQTT.js/commit/93f4482570b6e96d81a5466ea94c3fd7308ff31c))
* add unsubscribe ack packet to the unsubscribe callback ([#1922](https://github.com/mqttjs/MQTT.js/issues/1922)) ([8bcf304](https://github.com/mqttjs/MQTT.js/commit/8bcf3042a9133acf8d266d73bc67153a69660e05))

## [5.9.1](https://github.com/mqttjs/MQTT.js/compare/v5.9.0...v5.9.1) (2024-08-01)


### Bug Fixes

* **browser:** ensure proxy is defined ([ffc9805](https://github.com/mqttjs/MQTT.js/commit/ffc9805a51adf88bded6a1af1c0f66004e9e0f08))
* **browser:** prevent error `stream.push() after EOF` ([#1915](https://github.com/mqttjs/MQTT.js/issues/1915)) ([b5cc835](https://github.com/mqttjs/MQTT.js/commit/b5cc835fed9bd624c20d5f4f42b15c3cfa4b3fbe)), closes [#1914](https://github.com/mqttjs/MQTT.js/issues/1914)
* **test:** close open connections ([#1911](https://github.com/mqttjs/MQTT.js/issues/1911)) ([053a7be](https://github.com/mqttjs/MQTT.js/commit/053a7be91f93a0a27c63ca5ed488d9206fdec960))

# [5.9.0](https://github.com/mqttjs/MQTT.js/compare/v5.8.1...v5.9.0) (2024-07-26)


### Bug Fixes

* tets hang up ([#1906](https://github.com/mqttjs/MQTT.js/issues/1906)) ([c462530](https://github.com/mqttjs/MQTT.js/commit/c462530d2ec0b61a20cc43f188254bf2b403787a))
* **types:** add connectAsync overload signature with allowRetries ([#1909](https://github.com/mqttjs/MQTT.js/issues/1909)) ([6b278dc](https://github.com/mqttjs/MQTT.js/commit/6b278dca5a5b82b07835344f3c129ddd5b73e6e8))


### Features

* add `forceNativeWebSocket` client option ([#1910](https://github.com/mqttjs/MQTT.js/issues/1910)) ([103d172](https://github.com/mqttjs/MQTT.js/commit/103d1721d68952e536a3704a05a569c95f0a1987)), closes [#1796](https://github.com/mqttjs/MQTT.js/issues/1796) [#1895](https://github.com/mqttjs/MQTT.js/issues/1895)

## [5.8.1](https://github.com/mqttjs/MQTT.js/compare/v5.8.0...v5.8.1) (2024-07-18)


### Bug Fixes

* connect after client.end not working ([#1902](https://github.com/mqttjs/MQTT.js/issues/1902)) ([fbe5294](https://github.com/mqttjs/MQTT.js/commit/fbe52949b47378768fd325f01682a766a5965dfe))
* reschedule pings problem ([#1904](https://github.com/mqttjs/MQTT.js/issues/1904)) ([8e14d3e](https://github.com/mqttjs/MQTT.js/commit/8e14d3eac01f4fcccfc1ee657e0158d0644951ce))

# [5.8.0](https://github.com/mqttjs/MQTT.js/compare/v5.7.3...v5.8.0) (2024-07-05)


### Features

* add compatibility with txiki.js ([#1895](https://github.com/mqttjs/MQTT.js/issues/1895)) ([37b08c9](https://github.com/mqttjs/MQTT.js/commit/37b08c99fead5282e38b851ce1006f09521b038c))
* allow to pass custom timer for keepalive manager ([#1896](https://github.com/mqttjs/MQTT.js/issues/1896)) ([ee81184](https://github.com/mqttjs/MQTT.js/commit/ee811844d07365ca98721be90c4e1c2c1d8623b9))

## [5.7.3](https://github.com/mqttjs/MQTT.js/compare/v5.7.2...v5.7.3) (2024-06-26)


### Bug Fixes

* **wechat:** do not ignore path with `wx` protocol ([#1894](https://github.com/mqttjs/MQTT.js/issues/1894)) ([300c0b4](https://github.com/mqttjs/MQTT.js/commit/300c0b4dc5a37d8594a4cb1af5836c095b4d823c)), closes [#1892](https://github.com/mqttjs/MQTT.js/issues/1892)

## [5.7.2](https://github.com/mqttjs/MQTT.js/compare/v5.7.1...v5.7.2) (2024-06-19)


### Bug Fixes

* **security:** bump ws@8.17.1 and other audit issues ([#1891](https://github.com/mqttjs/MQTT.js/issues/1891)) ([096baaa](https://github.com/mqttjs/MQTT.js/commit/096baaaa882627554efd4bc9985ce8a5f2dfda5e))

## [5.7.1](https://github.com/mqttjs/MQTT.js/compare/v5.7.0...v5.7.1) (2024-06-18)


### Bug Fixes

* suback Error Codes Handling ([#1887](https://github.com/mqttjs/MQTT.js/issues/1887)) ([2a98e5e](https://github.com/mqttjs/MQTT.js/commit/2a98e5e878cad632fe86e738144688ee2b14a7dd))

# [5.7.0](https://github.com/mqttjs/MQTT.js/compare/v5.6.2...v5.7.0) (2024-05-28)


### Features

* add `unixSocket` option and `+unix` suffix support to protocol ([#1874](https://github.com/mqttjs/MQTT.js/issues/1874)) ([1004c78](https://github.com/mqttjs/MQTT.js/commit/1004c78db7d6763f21c98fa3db2f12e688ca33ff))

## [5.6.2](https://github.com/mqttjs/MQTT.js/compare/v5.6.1...v5.6.2) (2024-05-23)


### Bug Fixes

* prevent url.parse to set `path` option ([#1871](https://github.com/mqttjs/MQTT.js/issues/1871)) ([de0174f](https://github.com/mqttjs/MQTT.js/commit/de0174f033367dde352d1eff339064e704f610e1)), closes [#1870](https://github.com/mqttjs/MQTT.js/issues/1870)

## [5.6.1](https://github.com/mqttjs/MQTT.js/compare/v5.6.0...v5.6.1) (2024-05-17)


### Bug Fixes

* update is-browser.ts to account `undefined` navigator ([#1868](https://github.com/mqttjs/MQTT.js/issues/1868)) ([0111a7a](https://github.com/mqttjs/MQTT.js/commit/0111a7af4b71f2a973a712a1f0df6574660d6ec0)), closes [/github.com/mqttjs/MQTT.js/commit/6a03d29b86dc4fe8eae04eaf0f9fc661f1c3d1ea#commitcomment-142114121](https://github.com//github.com/mqttjs/MQTT.js/commit/6a03d29b86dc4fe8eae04eaf0f9fc661f1c3d1ea/issues/commitcomment-142114121) [/github.com/mqttjs/MQTT.js/pull/1868#pullrequestreview-2062507553](https://github.com//github.com/mqttjs/MQTT.js/pull/1868/issues/pullrequestreview-2062507553)

# [5.6.0](https://github.com/mqttjs/MQTT.js/compare/v5.5.6...v5.6.0) (2024-05-13)


### Features

* keepalive manager ([#1865](https://github.com/mqttjs/MQTT.js/issues/1865)) ([bad160a](https://github.com/mqttjs/MQTT.js/commit/bad160af2a7b76a5159652e6d3757e7798337261))

## [5.5.6](https://github.com/mqttjs/MQTT.js/compare/v5.5.5...v5.5.6) (2024-05-13)


### Bug Fixes

* do not shift pings on 'publish' packets ([#1866](https://github.com/mqttjs/MQTT.js/issues/1866)) ([e4d4663](https://github.com/mqttjs/MQTT.js/commit/e4d4663bcd5f87399b9d7bf101b364cda1c48d0e)), closes [#1863](https://github.com/mqttjs/MQTT.js/issues/1863) [#1861](https://github.com/mqttjs/MQTT.js/issues/1861)
* **electron:** detect electron context ([#1856](https://github.com/mqttjs/MQTT.js/issues/1856)) ([6a03d29](https://github.com/mqttjs/MQTT.js/commit/6a03d29b86dc4fe8eae04eaf0f9fc661f1c3d1ea))
* **ws:** ignored `host` option and default hostname in browser ([c6580a6](https://github.com/mqttjs/MQTT.js/commit/c6580a6685821c60a4595986227dba2a615b9958)), closes [#1730](https://github.com/mqttjs/MQTT.js/issues/1730)

## [5.5.5](https://github.com/mqttjs/MQTT.js/compare/v5.5.4...v5.5.5) (2024-04-30)


### Bug Fixes

* keepalive issues ([#1855](https://github.com/mqttjs/MQTT.js/issues/1855)) ([4f242f4](https://github.com/mqttjs/MQTT.js/commit/4f242f47bc8568299f04bade8aa4d1d11b939912))

## [5.5.4](https://github.com/mqttjs/MQTT.js/compare/v5.5.3...v5.5.4) (2024-04-26)


### Bug Fixes

* allow to use unix sockets in connect ([#1852](https://github.com/mqttjs/MQTT.js/issues/1852)) ([22c97b5](https://github.com/mqttjs/MQTT.js/commit/22c97b5f7536e3e36317c3b28dc0d70557b820ac)), closes [#1040](https://github.com/mqttjs/MQTT.js/issues/1040)
* **react-native:** process.nextTick is not a function error ([#1849](https://github.com/mqttjs/MQTT.js/issues/1849)) ([f62e207](https://github.com/mqttjs/MQTT.js/commit/f62e207def81b174af83d2e9525cddd1ce960fc3))

## [5.5.3](https://github.com/mqttjs/MQTT.js/compare/v5.5.2...v5.5.3) (2024-04-19)


### Bug Fixes

* possible race condition in ping timer ([#1848](https://github.com/mqttjs/MQTT.js/issues/1848)) ([0b7d687](https://github.com/mqttjs/MQTT.js/commit/0b7d687282e6342d5276946dfd4c4d1e0a66ba47)), closes [#1845](https://github.com/mqttjs/MQTT.js/issues/1845)
* wrong mqttjs version printed ([#1847](https://github.com/mqttjs/MQTT.js/issues/1847)) ([a24cf14](https://github.com/mqttjs/MQTT.js/commit/a24cf14654cb0fa74da1be2671dfaf57071fec40))

## [5.5.2](https://github.com/mqttjs/MQTT.js/compare/v5.5.1...v5.5.2) (2024-04-12)


### Bug Fixes

* **react-native:** error Cannot create URL for blob ([#1840](https://github.com/mqttjs/MQTT.js/issues/1840)) ([fc8fafb](https://github.com/mqttjs/MQTT.js/commit/fc8fafbdf5e01edc487192393293b944e77f5920))

## [5.5.1](https://github.com/mqttjs/MQTT.js/compare/v5.5.0...v5.5.1) (2024-04-10)


### Bug Fixes

* **browser:** uncaught error when stream is destroyed with error ([380f286](https://github.com/mqttjs/MQTT.js/commit/380f286d46f1c3d7a64c7bd851bbe8d84b797074)), closes [#1839](https://github.com/mqttjs/MQTT.js/issues/1839)

# [5.5.0](https://github.com/mqttjs/MQTT.js/compare/v5.4.0...v5.5.0) (2024-03-18)


### Bug Fixes

* **browser:** force closing client doesn't destroy websocket correctly ([#1820](https://github.com/mqttjs/MQTT.js/issues/1820)) ([f9b1204](https://github.com/mqttjs/MQTT.js/commit/f9b1204d7e0a04bb809be6205091fd89281b1e73)), closes [#1817](https://github.com/mqttjs/MQTT.js/issues/1817)
* expose mqttjs version on `MqttClient.VERSION` ([#1821](https://github.com/mqttjs/MQTT.js/issues/1821)) ([50776a7](https://github.com/mqttjs/MQTT.js/commit/50776a74c73c188f67faf399af90cfe0957a0e1f))


### Features

* `timerVariant` option to choose between native and worker timers ([#1818](https://github.com/mqttjs/MQTT.js/issues/1818)) ([547519d](https://github.com/mqttjs/MQTT.js/commit/547519daa8353a2d8a7fe9e4ae715601570b085f))

# [5.4.0](https://github.com/mqttjs/MQTT.js/compare/v5.3.6...v5.4.0) (2024-03-13)


### Bug Fixes

* add keepalive test in webworker ([#1807](https://github.com/mqttjs/MQTT.js/issues/1807)) ([8697b06](https://github.com/mqttjs/MQTT.js/commit/8697b06cae3265422620c38b76126381502a9c17))
* improve some flaky tests ([#1801](https://github.com/mqttjs/MQTT.js/issues/1801)) ([78e8f13](https://github.com/mqttjs/MQTT.js/commit/78e8f139ee0ad61e752421b9e594bea742af9745))
* print MQTTjs version and environment on constructor ([#1816](https://github.com/mqttjs/MQTT.js/issues/1816)) ([c0a6668](https://github.com/mqttjs/MQTT.js/commit/c0a666887ec313ee82142a825166e5b1d2e668bb))
* some others flaky tests ([#1808](https://github.com/mqttjs/MQTT.js/issues/1808)) ([f988058](https://github.com/mqttjs/MQTT.js/commit/f9880588244ac35c945302fad474f6c47f27acbc))
* update worker-timers from 7.0.78 to 7.1.4 ([#1813](https://github.com/mqttjs/MQTT.js/issues/1813)) ([2b75186](https://github.com/mqttjs/MQTT.js/commit/2b751861f2af7b914c3eb84265fb8474428045ec)), closes [#1802](https://github.com/mqttjs/MQTT.js/issues/1802)
* wrong default export for browser ([#1800](https://github.com/mqttjs/MQTT.js/issues/1800)) ([6237f45](https://github.com/mqttjs/MQTT.js/commit/6237f45f3f455b1b6ae7d339fc8a56a5eff91dc2))


### Features

* emit `Keepalive timeout` error and speed up tests using fake timers ([#1798](https://github.com/mqttjs/MQTT.js/issues/1798)) ([5d9bf10](https://github.com/mqttjs/MQTT.js/commit/5d9bf1004ba76098d4ae315fa7a4b44a9d26750b))

## [5.3.6](https://github.com/mqttjs/MQTT.js/compare/v5.3.5...v5.3.6) (2024-02-26)


### Bug Fixes

* **browser:** add `navigator` polifilly for wechat mini ([#1796](https://github.com/mqttjs/MQTT.js/issues/1796)) ([c26908a](https://github.com/mqttjs/MQTT.js/commit/c26908a242fa1f573689b03f554bb95d83e61c84)), closes [#1789](https://github.com/mqttjs/MQTT.js/issues/1789)
* emit `error` event on connack timeout ([#1781](https://github.com/mqttjs/MQTT.js/issues/1781)) ([56e6e23](https://github.com/mqttjs/MQTT.js/commit/56e6e23c0fb775bfd16edf04d6b28f6bbcf05023))

## [5.3.5](https://github.com/mqttjs/MQTT.js/compare/v5.3.4...v5.3.5) (2024-01-23)


### Bug Fixes

* bump help-me version to fix vulnerability in glob/inflight ([#1773](https://github.com/mqttjs/MQTT.js/issues/1773)) ([72f99dc](https://github.com/mqttjs/MQTT.js/commit/72f99dcb33b016bced8a2c03ac857c3940ddcda3))
* keepalive causes a reconnect loop when connection is lost ([#1779](https://github.com/mqttjs/MQTT.js/issues/1779)) ([3da5e84](https://github.com/mqttjs/MQTT.js/commit/3da5e84a158985cbe7bdf60d3a9744b71d98bb56)), closes [#1778](https://github.com/mqttjs/MQTT.js/issues/1778)

## [5.3.4](https://github.com/mqttjs/MQTT.js/compare/v5.3.3...v5.3.4) (2023-12-22)


### Bug Fixes

* leaked `close` listener in `startStreamProcess` loop ([#1759](https://github.com/mqttjs/MQTT.js/issues/1759)) ([0c10ef6](https://github.com/mqttjs/MQTT.js/commit/0c10ef680ccc34bbe49948d414f36879d816e4e0))
* typo in `client.ts` ([#1763](https://github.com/mqttjs/MQTT.js/issues/1763)) ([e3528ac](https://github.com/mqttjs/MQTT.js/commit/e3528ac32d9dc165f8f1238397bd4d02e1990279))

## [5.3.3](https://github.com/mqttjs/MQTT.js/compare/v5.3.2...v5.3.3) (2023-12-05)


### Bug Fixes

* don't use worker timers in worker and add web worker tests ([#1755](https://github.com/mqttjs/MQTT.js/issues/1755)) ([38fb6ae](https://github.com/mqttjs/MQTT.js/commit/38fb6ae16073ce31e38dbc1e41a155ad98e04dcc))
* improve worker tests ([#1757](https://github.com/mqttjs/MQTT.js/issues/1757)) ([4facb18](https://github.com/mqttjs/MQTT.js/commit/4facb18dd9f81bb6af437a6257960e6e878349ad))

## [5.3.2](https://github.com/mqttjs/MQTT.js/compare/v5.3.1...v5.3.2) (2023-12-04)


### Bug Fixes

* **browser:** use worker timers to prevent unexpected client close ([#1753](https://github.com/mqttjs/MQTT.js/issues/1753)) ([35448f3](https://github.com/mqttjs/MQTT.js/commit/35448f386687030e7b68bd88f5f4852fbb833c9d))
* catch all socket errors ([#1752](https://github.com/mqttjs/MQTT.js/issues/1752)) ([a50e85c](https://github.com/mqttjs/MQTT.js/commit/a50e85ccf780621cdf2fd0a0bfcf5575a590f173))
* prop `window` is not defined in web worker ([#1749](https://github.com/mqttjs/MQTT.js/issues/1749)) ([6591404](https://github.com/mqttjs/MQTT.js/commit/6591404b38c73550157e22f3e57683a634bb919c))

## [5.3.1](https://github.com/mqttjs/MQTT.js/compare/v5.3.0...v5.3.1) (2023-11-28)


### Bug Fixes

* improve environment detection in is-browser utility ([#1744](https://github.com/mqttjs/MQTT.js/issues/1744)) ([b094142](https://github.com/mqttjs/MQTT.js/commit/b09414285d5c27cf76a9ff72cbb5ffe8ecec3981))
* typescript compile error ([2655feb](https://github.com/mqttjs/MQTT.js/commit/2655feb7a182c53bfa5ea7321b4e1a6d5b031311)), closes [#1746](https://github.com/mqttjs/MQTT.js/issues/1746)

# [5.3.0](https://github.com/mqttjs/MQTT.js/compare/v5.2.2...v5.3.0) (2023-11-18)


### Features

* **browser:** websockets improvements and bundle optimizations ([#1732](https://github.com/mqttjs/MQTT.js/issues/1732)) ([0928f85](https://github.com/mqttjs/MQTT.js/commit/0928f8575a7b4c717fbd960c802e1dc41b436d0e))

## [5.2.2](https://github.com/mqttjs/MQTT.js/compare/v5.2.1...v5.2.2) (2023-11-14)


### Bug Fixes

* add default export ([#1740](https://github.com/mqttjs/MQTT.js/issues/1740)) ([fdb498f](https://github.com/mqttjs/MQTT.js/commit/fdb498fe7ebbdf2be0d1fbcb897f093d4fa40d05))

## [5.2.1](https://github.com/mqttjs/MQTT.js/compare/v5.2.0...v5.2.1) (2023-11-10)


### Bug Fixes

* make `import mqtt from 'mqtt'` work in browsers ([#1734](https://github.com/mqttjs/MQTT.js/issues/1734)) ([80e29a9](https://github.com/mqttjs/MQTT.js/commit/80e29a9dc6bb6ad51a7ac968361a550bc1da68cb))

# [5.2.0](https://github.com/mqttjs/MQTT.js/compare/v5.1.4...v5.2.0) (2023-11-09)


### Features

* esm version `dist/mqtt.esm.js` and replace `browserify` with `esbuild` ([#1731](https://github.com/mqttjs/MQTT.js/issues/1731)) ([3d6c3be](https://github.com/mqttjs/MQTT.js/commit/3d6c3be60eae8416dbfea1d15a826c0b5fc52c45))

## [5.1.4](https://github.com/mqttjs/MQTT.js/compare/v5.1.3...v5.1.4) (2023-10-30)


### Bug Fixes

* crash with React Native ([#1724](https://github.com/mqttjs/MQTT.js/issues/1724)) ([f6123f2](https://github.com/mqttjs/MQTT.js/commit/f6123f22a11a4eb4c34c874b47056cea7ef264a6))
* unambiguously detect web workers ([#1728](https://github.com/mqttjs/MQTT.js/issues/1728)) ([e44368c](https://github.com/mqttjs/MQTT.js/commit/e44368c0d7541d005ad668d5d44d080e29ca5778))

## [5.1.3](https://github.com/mqttjs/MQTT.js/compare/v5.1.2...v5.1.3) (2023-10-20)


### Bug Fixes

* add all `EventListener` methods to `TypedEventEmitter` interface ([#1718](https://github.com/mqttjs/MQTT.js/issues/1718)) ([b96882a](https://github.com/mqttjs/MQTT.js/commit/b96882a7e5ff2869badbbd34c9b2e1ac51c25d2a))

## [5.1.2](https://github.com/mqttjs/MQTT.js/compare/v5.1.1...v5.1.2) (2023-10-10)


### Bug Fixes

* detect web worker ([#1711](https://github.com/mqttjs/MQTT.js/issues/1711)) ([a75a467](https://github.com/mqttjs/MQTT.js/commit/a75a467e3524aef1d6038ed4ed14ab0407c146cb))

## [5.1.1](https://github.com/mqttjs/MQTT.js/compare/v5.1.0...v5.1.1) (2023-10-09)


### Bug Fixes

* restore nodejs 16 compatibility ([a347c0d](https://github.com/mqttjs/MQTT.js/commit/a347c0d81ff800c1469d8497542a8c5973b59e33)), closes [#1710](https://github.com/mqttjs/MQTT.js/issues/1710)

# [5.1.0](https://github.com/mqttjs/MQTT.js/compare/v5.0.5...v5.1.0) (2023-10-04)


### Bug Fixes

* **types:** import type error ([#1705](https://github.com/mqttjs/MQTT.js/issues/1705)) ([0960b68](https://github.com/mqttjs/MQTT.js/commit/0960b68f9b612640318931e971d7a715f0945bdd))


### Features

* custom websocket support ([#1696](https://github.com/mqttjs/MQTT.js/issues/1696)) ([d6fd3a8](https://github.com/mqttjs/MQTT.js/commit/d6fd3a8316642a17ff1e90b4d6c9d4656c3831e5))

## [5.0.5](https://github.com/mqttjs/MQTT.js/compare/v5.0.4...v5.0.5) (2023-09-08)


### Bug Fixes

* publish/subscribe/unsubscribe types and missing types exports ([#1688](https://github.com/mqttjs/MQTT.js/issues/1688)) ([2df6af7](https://github.com/mqttjs/MQTT.js/commit/2df6af717a7458eff1bf69be026734c973ade0a6))

## [5.0.4](https://github.com/mqttjs/MQTT.js/compare/v5.0.3...v5.0.4) (2023-08-31)


### Bug Fixes

* export js file in dist folder ([#1596](https://github.com/mqttjs/MQTT.js/issues/1596)) ([#1677](https://github.com/mqttjs/MQTT.js/issues/1677)) ([cbe0dc6](https://github.com/mqttjs/MQTT.js/commit/cbe0dc6be52bb3a5a9fa1f5b390973bf57f9da47))
* move exported types out of dev dependencies ([#1676](https://github.com/mqttjs/MQTT.js/issues/1676)) ([844e4ff](https://github.com/mqttjs/MQTT.js/commit/844e4ff6a75911e0d5f5fad75341ffc04eed1b15))
* set default value false for reconnecting in constructor ([#1674](https://github.com/mqttjs/MQTT.js/issues/1674)) ([#1678](https://github.com/mqttjs/MQTT.js/issues/1678)) ([312b57b](https://github.com/mqttjs/MQTT.js/commit/312b57ba982209d874d65a0857a019991a2f9b0d))

## [5.0.3](https://github.com/mqttjs/MQTT.js/compare/v5.0.2...v5.0.3) (2023-08-16)


### Bug Fixes

* browser detection ([183b35a](https://github.com/mqttjs/MQTT.js/commit/183b35aa3ed98fbbcbea6805994ef7c3cc8ee616)), closes [#1671](https://github.com/mqttjs/MQTT.js/issues/1671)
* close and end callbacks not executed in the WeChat mini program ([#1664](https://github.com/mqttjs/MQTT.js/issues/1664)) ([15ff607](https://github.com/mqttjs/MQTT.js/commit/15ff607f4c938d0e7a23c99413db7496cae12e48))

## [5.0.2](https://github.com/mqttjs/MQTT.js/compare/v5.0.1...v5.0.2) (2023-08-03)


### Bug Fixes

* **cli:** cli commands not working ([#1660](https://github.com/mqttjs/MQTT.js/issues/1660)) ([1bea132](https://github.com/mqttjs/MQTT.js/commit/1bea132e97eeeb7187525dcf7417761388919075))
* import mqtt correctly in test ([8f15557](https://github.com/mqttjs/MQTT.js/commit/8f15557d0c4e455f91c96df5793d32451f1601d3))
* **tests:** abstract store test types ([0ddd097](https://github.com/mqttjs/MQTT.js/commit/0ddd0976bb8dd7dc1d434e8bb954d440ba653fb2))

## [5.0.1](https://github.com/mqttjs/MQTT.js/compare/v5.0.0...v5.0.1) (2023-07-31)


### Bug Fixes

* resubscribe when no session present ([#895](https://github.com/mqttjs/MQTT.js/issues/895)) ([#1650](https://github.com/mqttjs/MQTT.js/issues/1650)) ([37acda6](https://github.com/mqttjs/MQTT.js/commit/37acda655e202025373311624e19589ae7ef5970))
* **types:** wrong `incomingStore` and `outgoingStore` ([8133eba](https://github.com/mqttjs/MQTT.js/commit/8133eba152e81ed77e6aa18eb2cc351c3c901aa8))

# [5.0.0](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0) (2023-07-25)


### Bug Fixes

* help message for client ID param for sub command is incorrect ([#1643](https://github.com/mqttjs/MQTT.js/issues/1643)) ([8521888](https://github.com/mqttjs/MQTT.js/commit/85218884728da85b626de6af0ac0bc9c26045f43))
* **types:** better streamBuilder types ([247e187](https://github.com/mqttjs/MQTT.js/commit/247e187b22e4ae916d1d89013e617b19688914dc))
* **types:** better types ([#1645](https://github.com/mqttjs/MQTT.js/issues/1645)) ([0f29bff](https://github.com/mqttjs/MQTT.js/commit/0f29bffb7e9088a1388139dcae04bb8731debc38))
* use explicit `connect` packet and infer types from `mqtt-packet` ([#1646](https://github.com/mqttjs/MQTT.js/issues/1646)) ([2a49ed3](https://github.com/mqttjs/MQTT.js/commit/2a49ed324e330deb5ca2ba8044b9196fc411ab8a))


### Features

* promises support ([#1644](https://github.com/mqttjs/MQTT.js/issues/1644)) ([d02e176](https://github.com/mqttjs/MQTT.js/commit/d02e17697f351b5fc2ed6d2cf689cbe40b829b9d))



# [5.0.0-beta.4](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0) (2023-07-21)



# [5.0.0-beta.3](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0) (2023-07-19)


### Bug Fixes

* make tests more reliable ([#1534](https://github.com/mqttjs/MQTT.js/issues/1534)) ([1076143](https://github.com/mqttjs/MQTT.js/commit/1076143a7ed6b07b91ded9985cc9a0bbb5a84da4))
* problem with publish callback invoked twice ([#1635](https://github.com/mqttjs/MQTT.js/issues/1635)) ([79b23a8](https://github.com/mqttjs/MQTT.js/commit/79b23a8f76abaceec67f063b6da0ee57a2c60697))
* **types:** subscribe definition ([#1527](https://github.com/mqttjs/MQTT.js/issues/1527)) ([debb7d9](https://github.com/mqttjs/MQTT.js/commit/debb7d93c17f5b68704c160ccd88e7e1db87d92d))


* chore!: remove unused deps, convert to ES2015 class (#1633) ([d71b000](https://github.com/mqttjs/MQTT.js/commit/d71b000773e4954c9a2ecbf4f750dac58017ef1a)), closes [#1633](https://github.com/mqttjs/MQTT.js/issues/1633)


### BREAKING CHANGES

* when creating an `MqttClient` instance `new` is now required



# [5.0.0-beta.2](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0) (2023-07-03)


### Bug Fixes

* browser tests not working ([#1628](https://github.com/mqttjs/MQTT.js/issues/1628)) ([8775fcd](https://github.com/mqttjs/MQTT.js/commit/8775fcdad952b39fa4b79dbe912ca42033be030a))
* setImmediate polyfill ([#1626](https://github.com/mqttjs/MQTT.js/issues/1626)) ([0ed0754](https://github.com/mqttjs/MQTT.js/commit/0ed0754b95b92df51ed49ae63058b31fdba1d415))


### Features

* option to disable `writeCache` and fix leak in subscriptions ([#1622](https://github.com/mqttjs/MQTT.js/issues/1622)) ([c8aa654](https://github.com/mqttjs/MQTT.js/commit/c8aa6540dbf68ffb0d88c287e2c862b28d3fb6e6)), closes [#1535](https://github.com/mqttjs/MQTT.js/issues/1535) [#1151](https://github.com/mqttjs/MQTT.js/issues/1151)



# [5.0.0-beta.1](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0) (2023-06-29)


### Bug Fixes

* `_storeProcessing` staying true after outStore got emptied ([#1492](https://github.com/mqttjs/MQTT.js/issues/1492)) ([f3f7be7](https://github.com/mqttjs/MQTT.js/commit/f3f7be76199115a622fde2590d44b1bb0cf57d41))
* consistency, used `this` instead of `that` ([#1618](https://github.com/mqttjs/MQTT.js/issues/1618)) ([800825b](https://github.com/mqttjs/MQTT.js/commit/800825bf619d83ef713a5b2fa1533bbf6ccac872))
* prevent store message on store when it's restored ([#1255](https://github.com/mqttjs/MQTT.js/issues/1255)) ([8d68c8c](https://github.com/mqttjs/MQTT.js/commit/8d68c8c3e38aede52741a06838933011a6fccc43))



# [5.0.0-beta.0](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0) (2023-06-27)


### Bug Fixes

* add missing export of UniqueMessageIdProvider and DefaultMessageIdProvider ([#1572](https://github.com/mqttjs/MQTT.js/issues/1572)) ([aa2e0ad](https://github.com/mqttjs/MQTT.js/commit/aa2e0ad49aadf333141f18cb85d2582abb8e19fc))
* IS_BROWSER check is now safer and more agnostic about the bundler ([#1571](https://github.com/mqttjs/MQTT.js/issues/1571)) ([b48b4b4](https://github.com/mqttjs/MQTT.js/commit/b48b4b4e79690c96033ea2df387c11f3bc26bf6a))
* **test:** `topicAliasMaximum` tests ([#1612](https://github.com/mqttjs/MQTT.js/issues/1612)) ([f1e5518](https://github.com/mqttjs/MQTT.js/commit/f1e5518150ea45067b87104abd9fed64ec13a48c))
* topicAliasMaximum under must be under Connect properties ([#1519](https://github.com/mqttjs/MQTT.js/issues/1519)) ([3b2e1cb](https://github.com/mqttjs/MQTT.js/commit/3b2e1cb7c4bf33ff66bcd1cc3091790a9635f19a))
* **types:** missing null declaration for error in subscription callback ([#1589](https://github.com/mqttjs/MQTT.js/issues/1589)) ([afc067b](https://github.com/mqttjs/MQTT.js/commit/afc067be2ca83990209b6176adec06f9a4c76a2c))
* **types:** topic alias controls and password ([#1509](https://github.com/mqttjs/MQTT.js/issues/1509)) ([85c9341](https://github.com/mqttjs/MQTT.js/commit/85c9341bba2676cfd069ec38a1a7cfda71647b68))


* chore!: drop support for node 12-14 (#1615) ([a2cbf61](https://github.com/mqttjs/MQTT.js/commit/a2cbf61c2a051a5ee69a50e00688e8ace79e7ef5)), closes [#1615](https://github.com/mqttjs/MQTT.js/issues/1615)


### BREAKING CHANGES

* Dropped support for NodeJS 12-14

# [5.0.0-beta.4](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.4) (2023-07-21)



# [5.0.0-beta.3](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.4) (2023-07-19)


### Bug Fixes

* make tests more reliable ([#1534](https://github.com/mqttjs/MQTT.js/issues/1534)) ([1076143](https://github.com/mqttjs/MQTT.js/commit/1076143a7ed6b07b91ded9985cc9a0bbb5a84da4))
* problem with publish callback invoked twice ([#1635](https://github.com/mqttjs/MQTT.js/issues/1635)) ([79b23a8](https://github.com/mqttjs/MQTT.js/commit/79b23a8f76abaceec67f063b6da0ee57a2c60697))
* **types:** subscribe definition ([#1527](https://github.com/mqttjs/MQTT.js/issues/1527)) ([debb7d9](https://github.com/mqttjs/MQTT.js/commit/debb7d93c17f5b68704c160ccd88e7e1db87d92d))


* chore!: remove unused deps, convert to ES2015 class (#1633) ([d71b000](https://github.com/mqttjs/MQTT.js/commit/d71b000773e4954c9a2ecbf4f750dac58017ef1a)), closes [#1633](https://github.com/mqttjs/MQTT.js/issues/1633)


### BREAKING CHANGES

* when creating an `MqttClient` instance `new` is now required



# [5.0.0-beta.2](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.4) (2023-07-03)


### Bug Fixes

* browser tests not working ([#1628](https://github.com/mqttjs/MQTT.js/issues/1628)) ([8775fcd](https://github.com/mqttjs/MQTT.js/commit/8775fcdad952b39fa4b79dbe912ca42033be030a))
* setImmediate polyfill ([#1626](https://github.com/mqttjs/MQTT.js/issues/1626)) ([0ed0754](https://github.com/mqttjs/MQTT.js/commit/0ed0754b95b92df51ed49ae63058b31fdba1d415))


### Features

* option to disable `writeCache` and fix leak in subscriptions ([#1622](https://github.com/mqttjs/MQTT.js/issues/1622)) ([c8aa654](https://github.com/mqttjs/MQTT.js/commit/c8aa6540dbf68ffb0d88c287e2c862b28d3fb6e6)), closes [#1535](https://github.com/mqttjs/MQTT.js/issues/1535) [#1151](https://github.com/mqttjs/MQTT.js/issues/1151)



# [5.0.0-beta.1](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.4) (2023-06-29)


### Bug Fixes

* `_storeProcessing` staying true after outStore got emptied ([#1492](https://github.com/mqttjs/MQTT.js/issues/1492)) ([f3f7be7](https://github.com/mqttjs/MQTT.js/commit/f3f7be76199115a622fde2590d44b1bb0cf57d41))
* consistency, used `this` instead of `that` ([#1618](https://github.com/mqttjs/MQTT.js/issues/1618)) ([800825b](https://github.com/mqttjs/MQTT.js/commit/800825bf619d83ef713a5b2fa1533bbf6ccac872))
* prevent store message on store when it's restored ([#1255](https://github.com/mqttjs/MQTT.js/issues/1255)) ([8d68c8c](https://github.com/mqttjs/MQTT.js/commit/8d68c8c3e38aede52741a06838933011a6fccc43))



# [5.0.0-beta.0](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.4) (2023-06-27)


### Bug Fixes

* add missing export of UniqueMessageIdProvider and DefaultMessageIdProvider ([#1572](https://github.com/mqttjs/MQTT.js/issues/1572)) ([aa2e0ad](https://github.com/mqttjs/MQTT.js/commit/aa2e0ad49aadf333141f18cb85d2582abb8e19fc))
* IS_BROWSER check is now safer and more agnostic about the bundler ([#1571](https://github.com/mqttjs/MQTT.js/issues/1571)) ([b48b4b4](https://github.com/mqttjs/MQTT.js/commit/b48b4b4e79690c96033ea2df387c11f3bc26bf6a))
* **test:** `topicAliasMaximum` tests ([#1612](https://github.com/mqttjs/MQTT.js/issues/1612)) ([f1e5518](https://github.com/mqttjs/MQTT.js/commit/f1e5518150ea45067b87104abd9fed64ec13a48c))
* topicAliasMaximum under must be under Connect properties ([#1519](https://github.com/mqttjs/MQTT.js/issues/1519)) ([3b2e1cb](https://github.com/mqttjs/MQTT.js/commit/3b2e1cb7c4bf33ff66bcd1cc3091790a9635f19a))
* **types:** missing null declaration for error in subscription callback ([#1589](https://github.com/mqttjs/MQTT.js/issues/1589)) ([afc067b](https://github.com/mqttjs/MQTT.js/commit/afc067be2ca83990209b6176adec06f9a4c76a2c))
* **types:** topic alias controls and password ([#1509](https://github.com/mqttjs/MQTT.js/issues/1509)) ([85c9341](https://github.com/mqttjs/MQTT.js/commit/85c9341bba2676cfd069ec38a1a7cfda71647b68))


* chore!: drop support for node 12-14 (#1615) ([a2cbf61](https://github.com/mqttjs/MQTT.js/commit/a2cbf61c2a051a5ee69a50e00688e8ace79e7ef5)), closes [#1615](https://github.com/mqttjs/MQTT.js/issues/1615)


### BREAKING CHANGES

* Dropped support for NodeJS 12-14

# [5.0.0-beta.3](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.3) (2023-07-19)


### Bug Fixes

* make tests more reliable ([#1534](https://github.com/mqttjs/MQTT.js/issues/1534)) ([1076143](https://github.com/mqttjs/MQTT.js/commit/1076143a7ed6b07b91ded9985cc9a0bbb5a84da4))
* problem with publish callback invoked twice ([#1635](https://github.com/mqttjs/MQTT.js/issues/1635)) ([79b23a8](https://github.com/mqttjs/MQTT.js/commit/79b23a8f76abaceec67f063b6da0ee57a2c60697))
* **types:** subscribe definition ([#1527](https://github.com/mqttjs/MQTT.js/issues/1527)) ([debb7d9](https://github.com/mqttjs/MQTT.js/commit/debb7d93c17f5b68704c160ccd88e7e1db87d92d))


* chore!: remove unused deps, convert to ES2015 class (#1633) ([d71b000](https://github.com/mqttjs/MQTT.js/commit/d71b000773e4954c9a2ecbf4f750dac58017ef1a)), closes [#1633](https://github.com/mqttjs/MQTT.js/issues/1633)


### BREAKING CHANGES

* when creating an `MqttClient` instance `new` is now required



# [5.0.0-beta.2](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.3) (2023-07-03)


### Bug Fixes

* browser tests not working ([#1628](https://github.com/mqttjs/MQTT.js/issues/1628)) ([8775fcd](https://github.com/mqttjs/MQTT.js/commit/8775fcdad952b39fa4b79dbe912ca42033be030a))
* setImmediate polyfill ([#1626](https://github.com/mqttjs/MQTT.js/issues/1626)) ([0ed0754](https://github.com/mqttjs/MQTT.js/commit/0ed0754b95b92df51ed49ae63058b31fdba1d415))


### Features

* option to disable `writeCache` and fix leak in subscriptions ([#1622](https://github.com/mqttjs/MQTT.js/issues/1622)) ([c8aa654](https://github.com/mqttjs/MQTT.js/commit/c8aa6540dbf68ffb0d88c287e2c862b28d3fb6e6)), closes [#1535](https://github.com/mqttjs/MQTT.js/issues/1535) [#1151](https://github.com/mqttjs/MQTT.js/issues/1151)



# [5.0.0-beta.1](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.3) (2023-06-29)


### Bug Fixes

* `_storeProcessing` staying true after outStore got emptied ([#1492](https://github.com/mqttjs/MQTT.js/issues/1492)) ([f3f7be7](https://github.com/mqttjs/MQTT.js/commit/f3f7be76199115a622fde2590d44b1bb0cf57d41))
* consistency, used `this` instead of `that` ([#1618](https://github.com/mqttjs/MQTT.js/issues/1618)) ([800825b](https://github.com/mqttjs/MQTT.js/commit/800825bf619d83ef713a5b2fa1533bbf6ccac872))
* prevent store message on store when it's restored ([#1255](https://github.com/mqttjs/MQTT.js/issues/1255)) ([8d68c8c](https://github.com/mqttjs/MQTT.js/commit/8d68c8c3e38aede52741a06838933011a6fccc43))



# [5.0.0-beta.0](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.3) (2023-06-27)


### Bug Fixes

* add missing export of UniqueMessageIdProvider and DefaultMessageIdProvider ([#1572](https://github.com/mqttjs/MQTT.js/issues/1572)) ([aa2e0ad](https://github.com/mqttjs/MQTT.js/commit/aa2e0ad49aadf333141f18cb85d2582abb8e19fc))
* IS_BROWSER check is now safer and more agnostic about the bundler ([#1571](https://github.com/mqttjs/MQTT.js/issues/1571)) ([b48b4b4](https://github.com/mqttjs/MQTT.js/commit/b48b4b4e79690c96033ea2df387c11f3bc26bf6a))
* **test:** `topicAliasMaximum` tests ([#1612](https://github.com/mqttjs/MQTT.js/issues/1612)) ([f1e5518](https://github.com/mqttjs/MQTT.js/commit/f1e5518150ea45067b87104abd9fed64ec13a48c))
* topicAliasMaximum under must be under Connect properties ([#1519](https://github.com/mqttjs/MQTT.js/issues/1519)) ([3b2e1cb](https://github.com/mqttjs/MQTT.js/commit/3b2e1cb7c4bf33ff66bcd1cc3091790a9635f19a))
* **types:** missing null declaration for error in subscription callback ([#1589](https://github.com/mqttjs/MQTT.js/issues/1589)) ([afc067b](https://github.com/mqttjs/MQTT.js/commit/afc067be2ca83990209b6176adec06f9a4c76a2c))
* **types:** topic alias controls and password ([#1509](https://github.com/mqttjs/MQTT.js/issues/1509)) ([85c9341](https://github.com/mqttjs/MQTT.js/commit/85c9341bba2676cfd069ec38a1a7cfda71647b68))


* chore!: drop support for node 12-14 (#1615) ([a2cbf61](https://github.com/mqttjs/MQTT.js/commit/a2cbf61c2a051a5ee69a50e00688e8ace79e7ef5)), closes [#1615](https://github.com/mqttjs/MQTT.js/issues/1615)


### BREAKING CHANGES

* Dropped support for NodeJS 12-14

# [5.0.0-beta.2](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.2) (2023-07-03)


### Bug Fixes

* browser tests not working ([#1628](https://github.com/mqttjs/MQTT.js/issues/1628)) ([8775fcd](https://github.com/mqttjs/MQTT.js/commit/8775fcdad952b39fa4b79dbe912ca42033be030a))
* setImmediate polyfill ([#1626](https://github.com/mqttjs/MQTT.js/issues/1626)) ([0ed0754](https://github.com/mqttjs/MQTT.js/commit/0ed0754b95b92df51ed49ae63058b31fdba1d415))


### Features

* option to disable `writeCache` and fix leak in subscriptions ([#1622](https://github.com/mqttjs/MQTT.js/issues/1622)) ([c8aa654](https://github.com/mqttjs/MQTT.js/commit/c8aa6540dbf68ffb0d88c287e2c862b28d3fb6e6)), closes [#1535](https://github.com/mqttjs/MQTT.js/issues/1535) [#1151](https://github.com/mqttjs/MQTT.js/issues/1151)



# [5.0.0-beta.1](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.2) (2023-06-29)


### Bug Fixes

* `_storeProcessing` staying true after outStore got emptied ([#1492](https://github.com/mqttjs/MQTT.js/issues/1492)) ([f3f7be7](https://github.com/mqttjs/MQTT.js/commit/f3f7be76199115a622fde2590d44b1bb0cf57d41))
* consistency, used `this` instead of `that` ([#1618](https://github.com/mqttjs/MQTT.js/issues/1618)) ([800825b](https://github.com/mqttjs/MQTT.js/commit/800825bf619d83ef713a5b2fa1533bbf6ccac872))
* prevent store message on store when it's restored ([#1255](https://github.com/mqttjs/MQTT.js/issues/1255)) ([8d68c8c](https://github.com/mqttjs/MQTT.js/commit/8d68c8c3e38aede52741a06838933011a6fccc43))



# [5.0.0-beta.0](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.2) (2023-06-27)


### Bug Fixes

* add missing export of UniqueMessageIdProvider and DefaultMessageIdProvider ([#1572](https://github.com/mqttjs/MQTT.js/issues/1572)) ([aa2e0ad](https://github.com/mqttjs/MQTT.js/commit/aa2e0ad49aadf333141f18cb85d2582abb8e19fc))
* IS_BROWSER check is now safer and more agnostic about the bundler ([#1571](https://github.com/mqttjs/MQTT.js/issues/1571)) ([b48b4b4](https://github.com/mqttjs/MQTT.js/commit/b48b4b4e79690c96033ea2df387c11f3bc26bf6a))
* **test:** `topicAliasMaximum` tests ([#1612](https://github.com/mqttjs/MQTT.js/issues/1612)) ([f1e5518](https://github.com/mqttjs/MQTT.js/commit/f1e5518150ea45067b87104abd9fed64ec13a48c))
* topicAliasMaximum under must be under Connect properties ([#1519](https://github.com/mqttjs/MQTT.js/issues/1519)) ([3b2e1cb](https://github.com/mqttjs/MQTT.js/commit/3b2e1cb7c4bf33ff66bcd1cc3091790a9635f19a))
* **types:** missing null declaration for error in subscription callback ([#1589](https://github.com/mqttjs/MQTT.js/issues/1589)) ([afc067b](https://github.com/mqttjs/MQTT.js/commit/afc067be2ca83990209b6176adec06f9a4c76a2c))
* **types:** topic alias controls and password ([#1509](https://github.com/mqttjs/MQTT.js/issues/1509)) ([85c9341](https://github.com/mqttjs/MQTT.js/commit/85c9341bba2676cfd069ec38a1a7cfda71647b68))


* chore!: drop support for node 12-14 (#1615) ([a2cbf61](https://github.com/mqttjs/MQTT.js/commit/a2cbf61c2a051a5ee69a50e00688e8ace79e7ef5)), closes [#1615](https://github.com/mqttjs/MQTT.js/issues/1615)


### BREAKING CHANGES

* Dropped support for NodeJS 12-14

# [5.0.0-beta.1](https://github.com/mqttjs/MQTT.js/compare/v5.0.0-beta.0...v5.0.0-beta.1) (2023-06-29)


### Bug Fixes

* `_storeProcessing` staying true after outStore got emptied ([#1492](https://github.com/mqttjs/MQTT.js/issues/1492)) ([f3f7be7](https://github.com/mqttjs/MQTT.js/commit/f3f7be76199115a622fde2590d44b1bb0cf57d41))
* consistency, used `this` instead of `that` ([#1618](https://github.com/mqttjs/MQTT.js/issues/1618)) ([800825b](https://github.com/mqttjs/MQTT.js/commit/800825bf619d83ef713a5b2fa1533bbf6ccac872))
* prevent store message on store when it's restored ([#1255](https://github.com/mqttjs/MQTT.js/issues/1255)) ([8d68c8c](https://github.com/mqttjs/MQTT.js/commit/8d68c8c3e38aede52741a06838933011a6fccc43))



# [5.0.0-beta.0](https://github.com/mqttjs/MQTT.js/compare/v4.3.7...v5.0.0-beta.0) (2023-06-27)


### Bug Fixes

* add missing export of UniqueMessageIdProvider and DefaultMessageIdProvider ([#1572](https://github.com/mqttjs/MQTT.js/issues/1572)) ([aa2e0ad](https://github.com/mqttjs/MQTT.js/commit/aa2e0ad49aadf333141f18cb85d2582abb8e19fc))
* IS_BROWSER check is now safer and more agnostic about the bundler ([#1571](https://github.com/mqttjs/MQTT.js/issues/1571)) ([b48b4b4](https://github.com/mqttjs/MQTT.js/commit/b48b4b4e79690c96033ea2df387c11f3bc26bf6a))
* **test:** `topicAliasMaximum` tests ([#1612](https://github.com/mqttjs/MQTT.js/issues/1612)) ([f1e5518](https://github.com/mqttjs/MQTT.js/commit/f1e5518150ea45067b87104abd9fed64ec13a48c))
* topicAliasMaximum under must be under Connect properties ([#1519](https://github.com/mqttjs/MQTT.js/issues/1519)) ([3b2e1cb](https://github.com/mqttjs/MQTT.js/commit/3b2e1cb7c4bf33ff66bcd1cc3091790a9635f19a))
* **types:** missing null declaration for error in subscription callback ([#1589](https://github.com/mqttjs/MQTT.js/issues/1589)) ([afc067b](https://github.com/mqttjs/MQTT.js/commit/afc067be2ca83990209b6176adec06f9a4c76a2c))
* **types:** topic alias controls and password ([#1509](https://github.com/mqttjs/MQTT.js/issues/1509)) ([85c9341](https://github.com/mqttjs/MQTT.js/commit/85c9341bba2676cfd069ec38a1a7cfda71647b68))


* chore!: drop support for node 12-14 (#1615) ([a2cbf61](https://github.com/mqttjs/MQTT.js/commit/a2cbf61c2a051a5ee69a50e00688e8ace79e7ef5)), closes [#1615](https://github.com/mqttjs/MQTT.js/issues/1615)


### BREAKING CHANGES

* Dropped support for NodeJS 12-14



## [4.3.7](https://github.com/mqttjs/MQTT.js/compare/v4.3.6...v4.3.7) (2022-03-14)


### Bug Fixes

* fix regression from [#1401](https://github.com/mqttjs/MQTT.js/issues/1401) and allow CI test failures to break gitthub workflow ([#1443](https://github.com/mqttjs/MQTT.js/issues/1443)) ([accd78e](https://github.com/mqttjs/MQTT.js/commit/accd78e38aa82c8cc1ea04029e56494276776c87))



## [4.3.6](https://github.com/mqttjs/MQTT.js/compare/v4.3.5...v4.3.6) (2022-02-17)


### Bug Fixes

* buffer is not defined in browser ([#1420](https://github.com/mqttjs/MQTT.js/issues/1420)) ([f5ab1b5](https://github.com/mqttjs/MQTT.js/commit/f5ab1b5d2a04813178fb478a7e345c0acf544258))
* **types:** connect function proper overloads for its parameters ([#1416](https://github.com/mqttjs/MQTT.js/issues/1416)) ([28c4040](https://github.com/mqttjs/MQTT.js/commit/28c4040c21246710f7ea3e161bc4145ba916c0de))



## [4.3.5](https://github.com/mqttjs/MQTT.js/compare/v4.3.4...v4.3.5) (2022-02-07)


### Bug Fixes

* **sendPacket:** drain leak ([#1401](https://github.com/mqttjs/MQTT.js/issues/1401)) ([7ec4b8f](https://github.com/mqttjs/MQTT.js/commit/7ec4b8fd602e220f50693cb83f082dab764ed3f2))



## [4.3.4](https://github.com/mqttjs/MQTT.js/compare/v4.3.3...v4.3.4) (2022-01-06)


### Bug Fixes

* migrate LruMap from collections to lru-cache. ([#1396](https://github.com/mqttjs/MQTT.js/issues/1396)) ([5c67037](https://github.com/mqttjs/MQTT.js/commit/5c670370c603f09ee25fbaba961156f59eaee1a2))



## [4.3.3](https://github.com/mqttjs/MQTT.js/compare/v4.3.2...v4.3.3) (2022-01-05)


### Bug Fixes

* remove collections.js dependency from number-allocator. ([#1394](https://github.com/mqttjs/MQTT.js/issues/1394)) ([ee75c32](https://github.com/mqttjs/MQTT.js/commit/ee75c322d6f31a3279f5a7f15ee4122760b1cc94)), closes [#1392](https://github.com/mqttjs/MQTT.js/issues/1392)



## [4.3.2](https://github.com/mqttjs/MQTT.js/compare/v4.3.1...v4.3.2) (2021-12-29)


### Bug Fixes

* **dependency:** Updated collections.js related package version. ([#1386](https://github.com/mqttjs/MQTT.js/issues/1386)) ([df89a2e](https://github.com/mqttjs/MQTT.js/commit/df89a2edf4fa15d3f8d56cd0b8290f9ddde7ceb8))



## [4.3.1](https://github.com/mqttjs/MQTT.js/compare/v4.3.0...v4.3.1) (2021-12-24)


### Bug Fixes

* **dependencies:** remove babel-eslint and update snazzy ([#1383](https://github.com/mqttjs/MQTT.js/issues/1383)) ([66d43d4](https://github.com/mqttjs/MQTT.js/commit/66d43d4f33e6af405468c94112f3d1361af773dc))



# [4.3.0](https://github.com/mqttjs/MQTT.js/compare/v4.2.8...v4.3.0) (2021-12-22)


### Bug Fixes

* **client:** Refined Topic Alias support. (Implement [#1300](https://github.com/mqttjs/MQTT.js/issues/1300)) ([#1301](https://github.com/mqttjs/MQTT.js/issues/1301)) ([c92b877](https://github.com/mqttjs/MQTT.js/commit/c92b877292d314e3e0b5d8f84b7f4b68a266aba2))
* **README:** typo Support ([#1353](https://github.com/mqttjs/MQTT.js/issues/1353)) ([c424426](https://github.com/mqttjs/MQTT.js/commit/c424426cd6345eba1f8016335839a667b3928e40))
* **resubscribe:** message id allocate twice ([#1337](https://github.com/mqttjs/MQTT.js/issues/1337)) ([7466819](https://github.com/mqttjs/MQTT.js/commit/7466819d62a5db554e41bf75e939a90f0dc46fe6))
* **tls:** Skip TLS SNI if host is IP address ([#1311](https://github.com/mqttjs/MQTT.js/issues/1311)) ([2679952](https://github.com/mqttjs/MQTT.js/commit/2679952587a0e3e1b5fcbfd6b11fca72c65fba95))
* **type:** add properties type for IClientSubscribeOptions ([#1378](https://github.com/mqttjs/MQTT.js/issues/1378)) ([8de9394](https://github.com/mqttjs/MQTT.js/commit/8de9394fa9afd61a1e0e726b0fe9d3637ed17cc9))
* **type:** fix push properties types ([#1359](https://github.com/mqttjs/MQTT.js/issues/1359)) ([cb6bdcb](https://github.com/mqttjs/MQTT.js/commit/cb6bdcb2c6c9e23f87bb24dbd1458eb0509cb02f))
* types ([#1341](https://github.com/mqttjs/MQTT.js/issues/1341)) ([59fab36](https://github.com/mqttjs/MQTT.js/commit/59fab369d2738edcf62306a67375763d737bc4ad))
* **typescript:**  OnConnectCallback with specs expecting Connack packet ([#1333](https://github.com/mqttjs/MQTT.js/issues/1333)) ([e3e15c3](https://github.com/mqttjs/MQTT.js/commit/e3e15c3d791615a8fcab46b331678dd5a5a755a0))
* **typescript:** Use correct version of @types/ws ([#1358](https://github.com/mqttjs/MQTT.js/issues/1358)) ([6581d33](https://github.com/mqttjs/MQTT.js/commit/6581d3340602903d3434a0053eeabe7019595ea2))
* websocket and typescript ([9979443](https://github.com/mqttjs/MQTT.js/commit/997944380702c17d6b144b499685e591b3178c11))
* **websockets:** revert URL WHATWG changes ([a3dd38e](https://github.com/mqttjs/MQTT.js/commit/a3dd38ed4374b0baa359430472f34078369ef02c))


### Features

* add support for ALPN TLS extension ([#1332](https://github.com/mqttjs/MQTT.js/issues/1332)) ([06f2fd2](https://github.com/mqttjs/MQTT.js/commit/06f2fd2d7666ec462f9f21c3bd19c35797de9083))
* **client:** auth handler for enhanced auth ([#1380](https://github.com/mqttjs/MQTT.js/issues/1380)) ([d5850b7](https://github.com/mqttjs/MQTT.js/commit/d5850b7ba2653da84d53fcb57e5767e4b9cbb09d))


### Reverts

* Revert "fix: types (#1341)" (#1344) ([e6672e8](https://github.com/mqttjs/MQTT.js/commit/e6672e80a48db6273af6bde338035d473ee3305a)), closes [#1341](https://github.com/mqttjs/MQTT.js/issues/1341) [#1344](https://github.com/mqttjs/MQTT.js/issues/1344)



## [4.2.5](https://github.com/mqttjs/MQTT.js/compare/v4.2.4...v4.2.5) (2020-11-12)


### Bug Fixes

* **auth opts:** Default to null for false-y values ([#1197](https://github.com/mqttjs/MQTT.js/issues/1197)) ([6a0e50a](https://github.com/mqttjs/MQTT.js/commit/6a0e50a52214f5e3b221d9f3d0bb86c5896e84c1))



## [4.2.4](https://github.com/mqttjs/MQTT.js/compare/v4.2.3...v4.2.4) (2020-10-29)


### Bug Fixes

* **ws:** add all parts of object to opts ([#1194](https://github.com/mqttjs/MQTT.js/issues/1194)) ([6240565](https://github.com/mqttjs/MQTT.js/commit/62405653b33ec5e5e0c8077e3bc9e9ee9a335cbe))



## [4.2.3](https://github.com/mqttjs/MQTT.js/compare/v4.2.2...v4.2.3) (2020-10-27)


### Bug Fixes

* **secure:** do not override password and username ([#1190](https://github.com/mqttjs/MQTT.js/issues/1190)) ([298dbb2](https://github.com/mqttjs/MQTT.js/commit/298dbb2e7e11e390794128b694a40986497b374c))



## [4.2.2](https://github.com/mqttjs/MQTT.js/compare/v4.2.1...v4.2.2) (2020-10-27)


### Bug Fixes

* check if client connected when reconnecting ([#1162](https://github.com/mqttjs/MQTT.js/issues/1162)) ([541f201](https://github.com/mqttjs/MQTT.js/commit/541f201834968eeee5b8599e3b29d8daecd4aac4)), closes [#1152](https://github.com/mqttjs/MQTT.js/issues/1152)
* replace url.parse by WHATWG URL API ([#1147](https://github.com/mqttjs/MQTT.js/issues/1147)) ([70a247c](https://github.com/mqttjs/MQTT.js/commit/70a247c29e0b05ddd8755e7b9c8c41a4c25b431b)), closes [#1130](https://github.com/mqttjs/MQTT.js/issues/1130)
* use 'readable-stream' instead of 'stream' ([#1170](https://github.com/mqttjs/MQTT.js/issues/1170)) ([04184e1](https://github.com/mqttjs/MQTT.js/commit/04184e16d349d020a520c0f77391f421a6755816))



## [4.2.1](https://github.com/mqttjs/MQTT.js/compare/v4.2.0...v4.2.1) (2020-08-24)


### Bug Fixes

* **websocket:** browser in ws ([#1145](https://github.com/mqttjs/MQTT.js/issues/1145)) ([40177ca](https://github.com/mqttjs/MQTT.js/commit/40177cac9a7d7e829b21963e1582c3eb9c13f20a))



# [4.2.0](https://github.com/mqttjs/MQTT.js/compare/v4.1.0...v4.2.0) (2020-08-12)


### Bug Fixes

* **browser support:** correct browser detection for webpack ([#1135](https://github.com/mqttjs/MQTT.js/issues/1135)) ([eedc2b2](https://github.com/mqttjs/MQTT.js/commit/eedc2b26cd6063a0b1152432a00f70de5e0b9bae))
* **browser support:** do not use process.nextTick without check that it exists ([#1136](https://github.com/mqttjs/MQTT.js/issues/1136)) ([963e554](https://github.com/mqttjs/MQTT.js/commit/963e554d3da2e4149c6f99b4fbe3aad6e620b955))
* **mqtt stores:** improve error handling and tests ([#1133](https://github.com/mqttjs/MQTT.js/issues/1133)) ([9c61419](https://github.com/mqttjs/MQTT.js/commit/9c614192dc7f7be20f715b7236f13e0b60717dce))
* path for bin files ([#1107](https://github.com/mqttjs/MQTT.js/issues/1107)) ([43cc1d1](https://github.com/mqttjs/MQTT.js/commit/43cc1d1f96e32b022ead3c8ce9c6ff4cbe2c3820))
* **typescript:** fix payloadFormatIndicator to boolean type ([#1115](https://github.com/mqttjs/MQTT.js/issues/1115)) ([5adb12a](https://github.com/mqttjs/MQTT.js/commit/5adb12a6f73c63e47ff9acd54bbcaef4f11c4baa))


### Features

* **mqtt5:** add properties object to publish options ([e8326ce](https://github.com/mqttjs/MQTT.js/commit/e8326ce3baf06a1bcdbd70c33c5178bc06f8959a))
* **websockets:** websocket-streams to ws ([#1108](https://github.com/mqttjs/MQTT.js/issues/1108)) ([b2c1215](https://github.com/mqttjs/MQTT.js/commit/b2c121511c7437b64724e9f1e89ebcd27e3c2cce))



# [4.1.0](https://github.com/mqttjs/MQTT.js/compare/v4.0.1...v4.1.0) (2020-05-19)



## [4.0.1](https://github.com/mqttjs/MQTT.js/compare/v4.0.0...v4.0.1) (2020-05-07)


### Reverts

* Revert "docs: adding client flowchart" ([ef2d590](https://github.com/mqttjs/MQTT.js/commit/ef2d5907efd5eed14aa3f46a2bf18b42ee0b3687))



# [4.0.0](https://github.com/mqttjs/MQTT.js/compare/v3.0.0...v4.0.0) (2020-04-27)


### Bug Fixes

* remove only ([#1058](https://github.com/mqttjs/MQTT.js/issues/1058)) ([c8ee0e2](https://github.com/mqttjs/MQTT.js/commit/c8ee0e2c2380b87cab4a31a0fcabaab9100d62c7))


### Features

* **client:** error handling and test resilience ([#1076](https://github.com/mqttjs/MQTT.js/issues/1076)) ([2e46e08](https://github.com/mqttjs/MQTT.js/commit/2e46e08396f7a854ff53454bd0fa1f1d96b1dd27))
* connection error handler ([#1053](https://github.com/mqttjs/MQTT.js/issues/1053)) ([3cea393](https://github.com/mqttjs/MQTT.js/commit/3cea393e2608e4c091f6bccdcf2d7bfd703bb98b))
* support SNI on TLS ([#1055](https://github.com/mqttjs/MQTT.js/issues/1055)) ([f6534c2](https://github.com/mqttjs/MQTT.js/commit/f6534c2d8348afadc91c4d6c636447430be4642b))



# [3.0.0](https://github.com/mqttjs/MQTT.js/compare/v2.18.8...v3.0.0) (2019-05-27)


### Bug Fixes

* delete completed incoming QOS 2 messages ([#893](https://github.com/mqttjs/MQTT.js/issues/893)) ([9a39faa](https://github.com/mqttjs/MQTT.js/commit/9a39faa37a3f12f10610af2b87b5be86375dc402))



## [2.18.8](https://github.com/mqttjs/MQTT.js/compare/v2.18.7...v2.18.8) (2018-08-30)



## [2.18.7](https://github.com/mqttjs/MQTT.js/compare/v2.18.6...v2.18.7) (2018-08-26)



## [2.18.6](https://github.com/mqttjs/MQTT.js/compare/v2.18.5...v2.18.6) (2018-08-25)



## [2.18.5](https://github.com/mqttjs/MQTT.js/compare/v2.18.4...v2.18.5) (2018-08-23)



## [2.18.4](https://github.com/mqttjs/MQTT.js/compare/v2.18.3...v2.18.4) (2018-08-22)



## [2.18.3](https://github.com/mqttjs/MQTT.js/compare/v2.18.2...v2.18.3) (2018-07-19)



## [2.18.2](https://github.com/mqttjs/MQTT.js/compare/v2.18.1...v2.18.2) (2018-06-28)



## [2.18.1](https://github.com/mqttjs/MQTT.js/compare/v2.18.0...v2.18.1) (2018-06-12)



# [2.18.0](https://github.com/mqttjs/MQTT.js/compare/v2.17.0...v2.18.0) (2018-05-12)



# [2.17.0](https://github.com/mqttjs/MQTT.js/compare/v2.16.0...v2.17.0) (2018-03-25)



# [2.16.0](https://github.com/mqttjs/MQTT.js/compare/v2.15.3...v2.16.0) (2018-03-01)



## [2.15.3](https://github.com/mqttjs/MQTT.js/compare/v2.15.2...v2.15.3) (2018-02-16)



## [2.15.2](https://github.com/mqttjs/MQTT.js/compare/v2.15.1...v2.15.2) (2018-02-08)



## [2.15.1](https://github.com/mqttjs/MQTT.js/compare/v2.15.0...v2.15.1) (2018-01-09)



# [2.15.0](https://github.com/mqttjs/MQTT.js/compare/v2.14.0...v2.15.0) (2017-12-09)



# [2.14.0](https://github.com/mqttjs/MQTT.js/compare/v2.13.1...v2.14.0) (2017-11-04)



## [2.13.1](https://github.com/mqttjs/MQTT.js/compare/v2.13.0...v2.13.1) (2017-10-16)



# [2.13.0](https://github.com/mqttjs/MQTT.js/compare/v2.12.1...v2.13.0) (2017-09-12)



## [2.12.1](https://github.com/mqttjs/MQTT.js/compare/v2.12.0...v2.12.1) (2017-09-08)



# [2.12.0](https://github.com/mqttjs/MQTT.js/compare/v2.11.0...v2.12.0) (2017-08-18)



# [2.11.0](https://github.com/mqttjs/MQTT.js/compare/v2.10.0...v2.11.0) (2017-08-03)



# [2.10.0](https://github.com/mqttjs/MQTT.js/compare/v2.9.3...v2.10.0) (2017-07-31)



## [2.9.3](https://github.com/mqttjs/MQTT.js/compare/v2.9.2...v2.9.3) (2017-07-25)



## [2.9.2](https://github.com/mqttjs/MQTT.js/compare/v2.9.1...v2.9.2) (2017-07-21)



## [2.9.1](https://github.com/mqttjs/MQTT.js/compare/v2.9.0...v2.9.1) (2017-07-06)



# [2.9.0](https://github.com/mqttjs/MQTT.js/compare/v2.8.2...v2.9.0) (2017-06-16)



## [2.8.2](https://github.com/mqttjs/MQTT.js/compare/v2.8.1...v2.8.2) (2017-06-06)



## [2.8.1](https://github.com/mqttjs/MQTT.js/compare/v2.8.0...v2.8.1) (2017-06-03)



# [2.8.0](https://github.com/mqttjs/MQTT.js/compare/v2.7.2...v2.8.0) (2017-05-26)



## [2.7.2](https://github.com/mqttjs/MQTT.js/compare/v2.7.0...v2.7.2) (2017-05-15)



# [2.7.0](https://github.com/mqttjs/MQTT.js/compare/v2.6.2...v2.7.0) (2017-05-01)



## [2.6.2](https://github.com/mqttjs/MQTT.js/compare/v2.6.1...v2.6.2) (2017-04-10)



## [2.6.1](https://github.com/mqttjs/MQTT.js/compare/v2.6.0...v2.6.1) (2017-04-09)



# [2.6.0](https://github.com/mqttjs/MQTT.js/compare/v2.5.2...v2.6.0) (2017-04-07)



## [2.5.2](https://github.com/mqttjs/MQTT.js/compare/v2.5.1...v2.5.2) (2017-04-03)



## [2.5.1](https://github.com/mqttjs/MQTT.js/compare/v2.5.0...v2.5.1) (2017-04-01)



# [2.5.0](https://github.com/mqttjs/MQTT.js/compare/v2.4.0...v2.5.0) (2017-03-18)



# [2.4.0](https://github.com/mqttjs/MQTT.js/compare/v2.3.1...v2.4.0) (2017-02-14)



## [2.3.1](https://github.com/mqttjs/MQTT.js/compare/v2.3.0...v2.3.1) (2017-01-30)



# [2.3.0](https://github.com/mqttjs/MQTT.js/compare/v2.2.1...v2.3.0) (2017-01-23)



## [2.2.1](https://github.com/mqttjs/MQTT.js/compare/v2.2.0...v2.2.1) (2017-01-07)



# [2.2.0](https://github.com/mqttjs/MQTT.js/compare/v2.1.3...v2.2.0) (2017-01-04)



## [2.1.3](https://github.com/mqttjs/MQTT.js/compare/v2.1.2...v2.1.3) (2016-11-17)



## [2.1.2](https://github.com/mqttjs/MQTT.js/compare/v2.1.1...v2.1.2) (2016-11-17)



## [2.1.1](https://github.com/mqttjs/MQTT.js/compare/v2.1.0...v2.1.1) (2016-11-13)



# [2.1.0](https://github.com/mqttjs/MQTT.js/compare/v2.0.1...v2.1.0) (2016-11-13)



## [2.0.1](https://github.com/mqttjs/MQTT.js/compare/v2.0.0...v2.0.1) (2016-09-26)



# [2.0.0](https://github.com/mqttjs/MQTT.js/compare/v1.14.1...v2.0.0) (2016-09-15)



## [1.14.1](https://github.com/mqttjs/MQTT.js/compare/v1.14.0...v1.14.1) (2016-08-25)



# [1.14.0](https://github.com/mqttjs/MQTT.js/compare/v1.13.0...v1.14.0) (2016-08-17)



# [1.13.0](https://github.com/mqttjs/MQTT.js/compare/v1.12.0...v1.13.0) (2016-07-25)



# [1.12.0](https://github.com/mqttjs/MQTT.js/compare/v1.11.2...v1.12.0) (2016-06-25)



## [1.11.2](https://github.com/mqttjs/MQTT.js/compare/v1.11.1...v1.11.2) (2016-06-17)



## [1.11.1](https://github.com/mqttjs/MQTT.js/compare/v1.11.0...v1.11.1) (2016-06-16)



# [1.11.0](https://github.com/mqttjs/MQTT.js/compare/v1.10.0...v1.11.0) (2016-06-04)



# [1.10.0](https://github.com/mqttjs/MQTT.js/compare/v1.9.0...v1.10.0) (2016-04-27)



# [1.9.0](https://github.com/mqttjs/MQTT.js/compare/v1.8.0...v1.9.0) (2016-04-25)



# [1.8.0](https://github.com/mqttjs/MQTT.js/compare/v1.7.5...v1.8.0) (2016-04-10)



## [1.7.5](https://github.com/mqttjs/MQTT.js/compare/v1.7.4...v1.7.5) (2016-03-18)



## [0.17.4](https://github.com/mqttjs/MQTT.js/compare/v1.7.3...v0.17.4) (2016-03-18)



## [1.7.3](https://github.com/mqttjs/MQTT.js/compare/v1.7.2...v1.7.3) (2016-02-27)



## [1.7.2](https://github.com/mqttjs/MQTT.js/compare/v1.7.1...v1.7.2) (2016-02-18)



## [1.7.1](https://github.com/mqttjs/MQTT.js/compare/v1.7.0...v1.7.1) (2016-02-09)



# [1.7.0](https://github.com/mqttjs/MQTT.js/compare/v1.6.3...v1.7.0) (2016-01-22)



## [1.6.3](https://github.com/mqttjs/MQTT.js/compare/v1.6.2...v1.6.3) (2015-12-23)



## [1.6.2](https://github.com/mqttjs/MQTT.js/compare/v1.6.1...v1.6.2) (2015-12-20)



## [1.6.1](https://github.com/mqttjs/MQTT.js/compare/v1.6.0...v1.6.1) (2015-12-10)



# [1.6.0](https://github.com/mqttjs/MQTT.js/compare/v1.5.0...v1.6.0) (2015-11-28)



# [1.5.0](https://github.com/mqttjs/MQTT.js/compare/v1.4.3...v1.5.0) (2015-10-26)



## [1.4.3](https://github.com/mqttjs/MQTT.js/compare/v1.4.2...v1.4.3) (2015-10-02)



## [1.4.2](https://github.com/mqttjs/MQTT.js/compare/v1.4.1...v1.4.2) (2015-10-02)



## [1.4.1](https://github.com/mqttjs/MQTT.js/compare/v1.4.0...v1.4.1) (2015-09-15)



# [1.4.0](https://github.com/mqttjs/MQTT.js/compare/v1.3.5...v1.4.0) (2015-09-02)



## [1.3.5](https://github.com/mqttjs/MQTT.js/compare/v1.3.4...v1.3.5) (2015-07-12)



## [1.3.4](https://github.com/mqttjs/MQTT.js/compare/v1.3.3...v1.3.4) (2015-07-07)



## [1.3.3](https://github.com/mqttjs/MQTT.js/compare/v1.3.2...v1.3.3) (2015-07-03)



## [1.3.2](https://github.com/mqttjs/MQTT.js/compare/v1.3.1...v1.3.2) (2015-06-26)



## [1.3.1](https://github.com/mqttjs/MQTT.js/compare/v1.3.0...v1.3.1) (2015-06-22)



# [1.3.0](https://github.com/mqttjs/MQTT.js/compare/v1.2.1...v1.3.0) (2015-06-11)



## [1.2.1](https://github.com/mqttjs/MQTT.js/compare/v1.2.0...v1.2.1) (2015-06-08)



# [1.2.0](https://github.com/mqttjs/MQTT.js/compare/v1.1.5...v1.2.0) (2015-05-21)



## [1.1.5](https://github.com/mqttjs/MQTT.js/compare/v1.1.4...v1.1.5) (2015-05-15)



## [1.1.4](https://github.com/mqttjs/MQTT.js/compare/v1.1.3...v1.1.4) (2015-05-10)



## [1.1.3](https://github.com/mqttjs/MQTT.js/compare/v1.1.2...v1.1.3) (2015-04-06)



## [1.1.2](https://github.com/mqttjs/MQTT.js/compare/v1.1.1...v1.1.2) (2015-03-16)



## [1.1.1](https://github.com/mqttjs/MQTT.js/compare/v1.1.0...v1.1.1) (2015-03-12)



# [1.1.0](https://github.com/mqttjs/MQTT.js/compare/v1.0.11...v1.1.0) (2015-02-28)



## [1.0.11](https://github.com/mqttjs/MQTT.js/compare/v1.0.10...v1.0.11) (2015-02-28)



## [1.0.10](https://github.com/mqttjs/MQTT.js/compare/v1.0.9...v1.0.10) (2015-02-15)


### Reverts

* Revert "Use port for protocol when none is provided" ([ed01032](https://github.com/mqttjs/MQTT.js/commit/ed010327d4ba8370612418ba780ae7ffef66c66e))



## [1.0.9](https://github.com/mqttjs/MQTT.js/compare/v1.0.8...v1.0.9) (2015-02-13)



## [1.0.8](https://github.com/mqttjs/MQTT.js/compare/v1.0.7...v1.0.8) (2015-02-06)



## [1.0.7](https://github.com/mqttjs/MQTT.js/compare/v1.0.6...v1.0.7) (2015-02-01)



## [1.0.6](https://github.com/mqttjs/MQTT.js/compare/v1.0.5...v1.0.6) (2015-01-29)



## [1.0.5](https://github.com/mqttjs/MQTT.js/compare/v1.0.4...v1.0.5) (2015-01-22)



## [1.0.4](https://github.com/mqttjs/MQTT.js/compare/v1.0.3...v1.0.4) (2015-01-22)



## [1.0.3](https://github.com/mqttjs/MQTT.js/compare/v1.0.2...v1.0.3) (2015-01-21)



## [1.0.2](https://github.com/mqttjs/MQTT.js/compare/v1.0.1...v1.0.2) (2015-01-19)



## [1.0.1](https://github.com/mqttjs/MQTT.js/compare/v1.0.0...v1.0.1) (2015-01-13)



# [1.0.0](https://github.com/mqttjs/MQTT.js/compare/v0.3.13...v1.0.0) (2015-01-13)



## [0.3.13](https://github.com/mqttjs/MQTT.js/compare/v0.3.12...v0.3.13) (2014-11-11)



## [0.3.12](https://github.com/mqttjs/MQTT.js/compare/v0.3.11...v0.3.12) (2014-08-31)



## [0.3.11](https://github.com/mqttjs/MQTT.js/compare/v0.3.10...v0.3.11) (2014-07-11)



## [0.3.10](https://github.com/mqttjs/MQTT.js/compare/v0.3.9...v0.3.10) (2014-06-21)



## [0.3.9](https://github.com/mqttjs/MQTT.js/compare/v0.3.8...v0.3.9) (2014-05-27)



## [0.3.8](https://github.com/mqttjs/MQTT.js/compare/v0.3.7...v0.3.8) (2014-03-19)



## [0.3.7](https://github.com/mqttjs/MQTT.js/compare/v0.3.6...v0.3.7) (2013-11-28)



## [0.3.6](https://github.com/mqttjs/MQTT.js/compare/v0.3.5...v0.3.6) (2013-11-28)



## [0.3.5](https://github.com/mqttjs/MQTT.js/compare/v0.3.4...v0.3.5) (2013-11-27)



## [0.3.3](https://github.com/mqttjs/MQTT.js/compare/v0.3.2...v0.3.3) (2013-09-30)



## [0.3.2](https://github.com/mqttjs/MQTT.js/compare/v0.3.1...v0.3.2) (2013-09-19)



## [0.3.1](https://github.com/mqttjs/MQTT.js/compare/v0.3.0...v0.3.1) (2013-08-22)



# [0.3.0](https://github.com/mqttjs/MQTT.js/compare/v0.2.11...v0.3.0) (2013-08-21)


### Reverts

* Revert "Adding a little buffer to cope with slow connections." ([ff1e3ed](https://github.com/mqttjs/MQTT.js/commit/ff1e3ed8613d4d57b66318019b64f5cb160b1bb2))



## [0.2.11](https://github.com/mqttjs/MQTT.js/compare/v0.2.10...v0.2.11) (2013-07-20)



## [0.2.10](https://github.com/mqttjs/MQTT.js/compare/v0.2.9...v0.2.10) (2013-06-12)



## [0.2.9](https://github.com/mqttjs/MQTT.js/compare/v0.2.8...v0.2.9) (2013-05-29)



## [0.2.8](https://github.com/mqttjs/MQTT.js/compare/v0.2.5...v0.2.8) (2013-05-27)



## [0.2.5](https://github.com/mqttjs/MQTT.js/compare/v0.2.4...v0.2.5) (2013-03-23)



## [0.2.4](https://github.com/mqttjs/MQTT.js/compare/v0.2.3...v0.2.4) (2013-03-07)



## [0.2.3](https://github.com/mqttjs/MQTT.js/compare/v0.2.2...v0.2.3) (2013-03-07)



## [0.2.2](https://github.com/mqttjs/MQTT.js/compare/0.2.0...v0.2.2) (2013-03-06)



# [0.2.0](https://github.com/mqttjs/MQTT.js/compare/0.1.8...0.2.0) (2013-02-28)



## [0.1.8](https://github.com/mqttjs/MQTT.js/compare/v0.1.3...0.1.8) (2013-02-12)



## [0.1.3](https://github.com/mqttjs/MQTT.js/compare/v0.1.2...v0.1.3) (2012-02-06)



## [0.1.2](https://github.com/mqttjs/MQTT.js/compare/v0.1.1...v0.1.2) (2012-01-23)



## [0.1.1](https://github.com/mqttjs/MQTT.js/compare/v0.1.0...v0.1.1) (2012-01-18)



# 0.1.0 (2012-01-17)