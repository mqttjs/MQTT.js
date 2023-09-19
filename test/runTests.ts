import { readdirSync } from 'node:fs'
import { run } from 'node:test'
import process from 'node:process'
import { spec as Spec } from 'node:test/reporters'
import { basename } from 'node:path'
import { cpus } from 'node:os'

const spec = new Spec()

const files = readdirSync(__dirname)
	.filter((f) => f.endsWith('.ts') && f !== basename(__filename))
	.map((f) => `${__dirname}/${f}`)

run({ files, timeout: 60 * 1000, concurrency: cpus().length })
	.compose(spec)
	.pipe(process.stdout)
