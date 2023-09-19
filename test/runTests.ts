import { readdirSync } from 'node:fs'
import { run } from 'node:test'
import process from 'node:process'
import { tap } from 'node:test/reporters'
import { basename } from 'node:path'

const files = readdirSync(__dirname)
	.filter((f) => f.endsWith('.ts') && f !== basename(__filename))
	.map((f) => `${__dirname}/${f}`)

run({ files, timeout: 60 * 1000, concurrency: true })
	.compose(tap)
	.pipe(process.stdout)
