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



