import { expect, $ } from '@wdio/globals'
// import { join } from 'path'
import isBrowser from '../../../build/lib/is-browser'
// import isBrowser from join(process.cwd(), '../build/lib/is-browser')

describe('Electron Testing', () => {
    it('should render electron window', async () => {
        await expect($('h1')).toHaveText('💖 Hello World!')
    })

    it('should connect', async() => {
      await expect($('#status')).toHaveText('online')
    })

    it('should not be a browser context', async() =>{
      expect(isBrowser).toBe(false)
    })

    it('should use protocoll mqtt', async() => {
      await expect($('#protocol')).toHaveText('mqtt')
    })
})

