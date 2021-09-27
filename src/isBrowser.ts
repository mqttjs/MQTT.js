/**
 * isBrowser
 * 
 * Determines if program is running in browser environment.
 * @returns boolean
 */

export function isBrowser (): boolean {
  const inBrowser = typeof process !== 'undefined' && process.title === 'browser'
  return inBrowser
}