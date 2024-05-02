const isStandardBrowserEnv = () => {
	// window is only defined when it is a browser
	if (typeof window !== 'undefined') {
		// Is the process an electron application
		const electronMainCheck = Object.prototype.hasOwnProperty.call(
			process.versions,
			'electron',
		)
		// In case of electron the userAgent contains a string formated like: 'Electron/<version>'
		// we can search for that to detect if it is an electron application
		const electronRenderCheck =
			navigator.userAgent.toLowerCase().indexOf(' electron/') > -1
		if (electronMainCheck && electronRenderCheck) {
			// Both electron checks are only true if the following webPreferences are set in the main electron BrowserWindow()
			//   webPreferences: {
			//     sandbox: false,
			//     nodeIntegration: true
			//     contextIsolation: false
			// }
			return false
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
