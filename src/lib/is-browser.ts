const isBrowser =
	(typeof window !== 'undefined' && typeof window.document !== 'undefined') ||
	// eslint-disable-next-line no-restricted-globals
	(typeof self !== 'undefined' && typeof self.postMessage === 'function') // is web worker

export default isBrowser
