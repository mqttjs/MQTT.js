import { expect, $ } from '@wdio/globals'

describe('Electron Testing', () => {


    it('should print application title', async () => {
        await expect($('h1')).toHaveText('💖 Hello World!')
    })

    it('should connect', async() => {
      await expect($('#status')).toHaveText('online')
    })
})

