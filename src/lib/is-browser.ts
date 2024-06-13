import MqttClient from './client'

const isStandardBrowserEnv = () => {
	return typeof window !== 'undefined' && typeof window.document !== 'undefined'
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
	MqttClient.NEED_CHECK_BROWSER_ENVIRONMENT !== false && (isStandardBrowserEnv() || isWebWorkerEnv() || isReactNativeEnv())

export const isWebWorker = isWebWorkerEnv()

export const isReactNativeBrowser = isReactNativeEnv()

export default isBrowser
