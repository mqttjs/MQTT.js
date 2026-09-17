const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const scheduler = path.join(root, 'build/lib/browser-next-tick.js')
const shim = path.join(root, 'build/lib/browser-process.js')
const upstreamProcess = require.resolve('process/browser.js')
const nextTickArgs = require.resolve('process-nextick-args')

// Inspect syntax rather than JSPM's version-dependent hashed chunk filenames.
function schedulerDefinitions(source) {
    const found = []
    const functions = new Map()
    function collect(node) {
        if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node)
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer &&
            (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))) functions.set(node.name.text, node)
        ts.forEachChild(node, collect)
    }
    collect(source)
    function memberName(name) {
        if (ts.isComputedPropertyName(name)) name = name.expression
        return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined
    }
    function visit(node) {
        if (ts.isFunctionDeclaration(node) && node.name?.text === 'nextTick') found.push(node)
        const propertyName = value => ts.isPropertyAccessExpression(value) ? value.name.text :
            ts.isElementAccessExpression(value) && ts.isStringLiteral(value.argumentExpression) ? value.argumentExpression.text : undefined
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            propertyName(node.left) === 'nextTick' &&
            (ts.isFunctionExpression(node.right) || ts.isArrowFunction(node.right))) found.push(node)
        if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'nextTick' && node.initializer &&
            (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))) found.push(node)
        if (ts.isMethodDeclaration(node) && memberName(node.name) === 'nextTick') found.push(node)
        if (ts.isPropertyAssignment(node) && memberName(node.name) === 'nextTick' &&
            (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer))) found.push(node)
        if (ts.isPropertyAssignment(node) && memberName(node.name) === 'nextTick' &&
            ts.isIdentifier(node.initializer) && functions.has(node.initializer.text)) found.push(functions.get(node.initializer.text))
        if (ts.isExportSpecifier(node) && node.name.text === 'nextTick') {
            const local = (node.propertyName || node.name).text
            if (functions.has(local)) found.push(functions.get(local))
        }
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
            propertyName(node.left) === 'nextTick' && ts.isIdentifier(node.right) && functions.has(node.right.text)) {
            found.push(functions.get(node.right.text))
        }
        ts.forEachChild(node, visit)
    }
    visit(source)
    return [...new Set(found)]
}

function browserProcessPlugin() {
    return {
        name: 'browser-process',
        setup(build) {
            build.initialOptions.inject = [...(build.initialOptions.inject || []),
                path.join(__dirname, 'browser-process-inject.js')]
            build.onResolve({ filter: /^(node:)?process(?:\/browser(?:\.js)?|\/)?$/ }, args => {
                if (path.resolve(args.importer) === shim && args.path === 'process/browser.js') {
                    return { path: upstreamProcess }
                }
                return { path: shim }
            })
            // Source probes and the compiled package must use the same instance.
            build.onResolve({ filter: /(?:^|\/)browser-next-tick(?:\.js)?$/ }, args => {
                const resolved = path.resolve(args.resolveDir, args.path).replace(/\.js$/, '')
                if ([scheduler.replace(/\.js$/, ''), path.join(root, 'src/lib/browser-next-tick')].includes(resolved)) {
                    return { path: scheduler }
                }
            })
            build.onLoad({ filter: /\.[cm]?[jt]s$/ }, args => {
                if (args.namespace !== 'file') return
                const contents = fs.readFileSync(args.path, 'utf8')
                if (!contents.includes('nextTick')) return
                const source = ts.createSourceFile(args.path, contents, ts.ScriptTarget.Latest, true)
                const definitions = schedulerDefinitions(source)
                if (path.resolve(args.path) === scheduler) {
                    if (definitions.length !== 1) throw new Error('Expected one MQTT browser scheduler')
                    return
                }
                if (args.path === nextTickArgs) {
                    if (definitions.length !== 1 || !ts.isFunctionDeclaration(definitions[0])) {
                        throw new Error('Unexpected process-nextick-args wrapper shape')
                    }
                    // The browser scheduler already forwards arbitrary arguments.
                    return { contents: `export { nextTick } from ${JSON.stringify(scheduler)};`, loader: 'js' }
                }
                if (args.path === upstreamProcess) {
                    const assignments = definitions.filter(node => ts.isBinaryExpression(node) &&
                        node.left.expression.getText(source) === 'process')
                    if (definitions.length !== 1 || assignments.length !== 1) {
                        throw new Error('Unexpected process/browser scheduler shape')
                    }
                    const assignment = assignments[0]
                    return { contents: `import { nextTick as mqttNextTick } from ${JSON.stringify(scheduler)};\n` +
                        contents.slice(0, assignment.right.getStart(source)) + 'mqttNextTick' +
                        contents.slice(assignment.right.end), loader: 'js', resolveDir: path.dirname(args.path) }
                }
                if (definitions.length && args.path.includes(`${path.sep}@jspm${path.sep}core${path.sep}`)) {
                    // Preserve JSPM-specific process fields; replace only its scheduler.
                    if (definitions.length !== 1 || !ts.isFunctionDeclaration(definitions[0]) ||
                        !/\bnextTick\s*,/.test(contents) || !/export\s*\{[^}]*\bprocess\b/.test(contents)) {
                        throw new Error(`Unexpected JSPM process provider: ${args.path}`)
                    }
                    const declaration = definitions[0]
                    return { contents: contents.slice(0, declaration.getStart(source)) +
                        `import { nextTick } from ${JSON.stringify(scheduler)};` + contents.slice(declaration.end),
                        loader: 'js', resolveDir: path.dirname(args.path) }
                }
                if (definitions.length) throw new Error(`Unexpected browser nextTick provider: ${args.path}`)
            })
        }
    }
}

module.exports = { browserProcessPlugin, scheduler, shim }
