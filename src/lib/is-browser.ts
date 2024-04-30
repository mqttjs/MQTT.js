const isStandardBrowserEnv = () => {
	if (typeof window !== 'undefined') {
		return (
			window.navigator.userAgent.toLowerCase().indexOf(' electron/') >
				-1 &&
			Object.prototype.hasOwnProperty.call(process.versions, 'electron')
		)
		// const userAgent = window.navigator.userAgent.toLowerCase()
		// if (
		// 	userAgent.indexOf(' electron/') > -1 ||
		// 	Object.prototype.hasOwnProperty.call(process.versions, 'electron')
		// ) {
		// 	return false
		// }
	}
	return (
		typeof window !== 'undefined' && typeof window.document !== 'undefined'
	)
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
