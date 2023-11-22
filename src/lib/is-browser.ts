const isStandardBrowserEnv = () =>
	typeof window !== 'undefined' && typeof window.document !== 'undefined'

const isWebWorkerEnv = () =>
	Boolean(
		// eslint-disable-next-line no-restricted-globals
		typeof self === 'object' &&
			// eslint-disable-next-line no-restricted-globals
			self?.constructor?.name?.includes('WorkerGlobalScope'),
	)

const isReactNativeEnv = () =>
	typeof navigator !== 'undefined' && navigator.product === 'ReactNative'

const isBrowser =
	isStandardBrowserEnv() || isWebWorkerEnv() || isReactNativeEnv()

export default isBrowser
