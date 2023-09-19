import { readdirSync } from 'node:fs'
import { run } from 'node:test'
import process from 'node:process'
import { spec as Spec } from 'node:test/reporters'
import { basename } from 'node:path'
import { cpus } from 'node:os'

const spec = new Spec()

let exitCode = 0

const files = readdirSync(__dirname)
	.filter((f) => f.endsWith('.ts') && f !== basename(__filename))
	.map((f) => `${__dirname}/${f}`)

const testStream = run({
	files,
	timeout: 60 * 1000,
	concurrency: cpus().length,
})

testStream.compose(spec).pipe(process.stdout)

const summary: string[] = []

testStream.once('test:fail', (data) => {
	exitCode = 1
	summary.push(`${data.file} - Test ${data.name} failed:\n${data.details} `)
})

testStream.once('test:stderr', (data) => {
	exitCode = 1
	summary.push(`${data.file} - Error:\n${data.message} `)
})

testStream.once('end', () => {
	if (summary.length > 0) {
		console.error('--- ERRORS SUMMARY ---\n')
		console.error(summary.join('\n'))
		console.error('\n--- END OF SUMMARY ---')
	}
	process.exit(exitCode)
})
