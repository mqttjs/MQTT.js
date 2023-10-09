const isBrowser =
	(typeof window !== 'undefined' && typeof window.document !== 'undefined') ||
	(typeof self !== 'undefined' && typeof self.postMessage === 'function') // is web worker

export default isBrowser
