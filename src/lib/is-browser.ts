const legacyIsBrowser =
	(typeof process !== 'undefined' && process.title === 'browser') ||
	// eslint-disable-next-line camelcase, @typescript-eslint/ban-ts-comment
	// @ts-ignore
	typeof __webpack_require__ === 'function'

const isBrowser =
	typeof window !== 'undefined' && typeof document !== 'undefined'

const IS_BROWSER = isBrowser || legacyIsBrowser

export default IS_BROWSER
