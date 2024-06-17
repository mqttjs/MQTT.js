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

const start = Date.now()

const testStream = run({
	files,
	timeout: 90 * 1000,
	concurrency: cpus().length,
})

testStream.compose(spec).pipe(process.stdout)

const summary: string[] = []

testStream.on('test:fail', (data) => {
	exitCode = 1
	const error = data.details.error

	summary.push(
		`${data.file} - "${data.name}" (${Math.round(
			data.details.duration_ms,
		)}ms)\n${error.toString()} `,
	)
})

testStream.on('test:stderr', (data) => {
	summary.push(`${data.file} - Error:\n${data.message} `)
})

testStream.once('end', () => {
	const duration = Date.now() - start
	// print duration in blue
	console.log(
		'\x1b[34m%s\x1b[0m',
		`\nℹ Duration: ${duration / 1000}s\n`,
		'\x1b[0m',
	)
	if (summary.length > 0) {
		console.error('\x1b[31m%s\x1b', '\n✖ failing tests:\n')
		console.error(summary.join('\n'))
		console.error('\n------', '\x1b[0m\n')
	}
	process.exit(exitCode)
})
