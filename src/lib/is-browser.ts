const isBrowser =
	(typeof window !== 'undefined' && typeof window.document !== 'undefined') ||
	// eslint-disable-next-line no-restricted-globals
	(typeof self === 'object' && self.constructor && self.constructor.name === 'DedicatedWorkerGlobalScope') // is web worker

export default isBrowser
