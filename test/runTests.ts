import { readdirSync } from 'node:fs'
import { run } from 'node:test'
import process from 'node:process'
import { tap } from 'node:test/reporters'

const files = readdirSync(__dirname)
	.filter((f) => f.endsWith('.ts'))
	.map((f) => `${__dirname}/${f}`)

console.log('Running tests:')

run({ files, timeout: 60 * 1000 })
	.compose(tap)
	.pipe(process.stdout)
