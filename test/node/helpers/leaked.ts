// include this as first module when looking for leaked handles
import leaked from 'leaked-handles'

leaked.set({
	fullStack: true,
	timeout: 15000,
	debugSockets: true,
})
