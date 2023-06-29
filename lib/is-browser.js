const legacyIsBrowser =
(typeof process !== 'undefined' && process.title === 'browser') ||
// eslint-disable-next-line camelcase
  typeof __webpack_require__ === 'function'

const isBrowser =
  typeof window !== 'undefined' && typeof document !== 'undefined'

module.exports = {
  IS_BROWSER: isBrowser || legacyIsBrowser
}
