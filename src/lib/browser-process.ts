import baseProcess from 'process/browser.js'
import { nextTick } from './browser-next-tick'

export { nextTick }

// Keep the established process/browser compatibility surface, replacing only
// its timer-based scheduler without mutating the dependency's shared object.
export const {
	title,
	browser,
	env,
	argv,
	version,
	versions,
	on,
	addListener,
	once,
	off,
	removeListener,
	removeAllListeners,
	emit,
	prependListener,
	prependOnceListener,
	listeners,
	binding,
	cwd,
	chdir,
	umask,
} = baseProcess

export default { ...baseProcess, nextTick }
