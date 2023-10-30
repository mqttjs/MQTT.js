const isBrowser =
	(typeof window !== 'undefined' && typeof window.document !== 'undefined') ||
	// eslint-disable-next-line no-restricted-globals
	(typeof self === 'object' && self.constructor && self.constructor.name === 'DedicatedWorkerGlobalScope') || // is web worker
	(typeof navigator !== 'undefined' && navigator.product === 'ReactNative') // while navigator.product is deprecated

export default isBrowser
