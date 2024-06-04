const isStandardBrowserEnv = () => {
	// window is only defined when it is a browser
	if (typeof window !== 'undefined') {
		if (typeof process !== 'undefined') {
			if (process.type === 'renderer') return true
			else if (typeof process.electron !== 'undefined') return false
		}

		return typeof window.document !== 'undefined'
	}

	// return false if nothing is detected
	return false
}

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

export const isWebWorker = isWebWorkerEnv()

export const isReactNativeBrowser = isReactNativeEnv()

export default isBrowser
