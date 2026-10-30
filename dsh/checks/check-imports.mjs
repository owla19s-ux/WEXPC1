#!/usr/bin/env node
// Checks relative TypeScript imports in pinned upstream Cordis/Loader sources.
// Static completeness check only, not a TypeScript build or runtime test.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../upstream/vendor')
const packages = ['cordis', 'loader', 'cosmokit', 'schemastery']
const errors = []
const missing = new Set()
const external = new Set()
let filesChecked = 0
let relativeImports = 0

function walk(dir) {
  if (!fs.existsSync(dir)) {
    errors.push('Missing source directory: ' + path.relative(root, dir))
    return
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, ent.name)
    if (ent.isDirectory()) { walk(file); continue }
    if (!ent.isFile() || !/\.(?:ts|tsx|mts|js|mjs)$/.test(ent.name)) continue
    filesChecked++
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"\n]+)['"]/g)) {
      const specifier = match[1]
      if (!specifier.startsWith('.')) {
        if (!specifier.startsWith('node:')) external.add(specifier)
        continue
      }
      relativeImports++
      const resolved = path.resolve(path.dirname(file), specifier)
      const options = [resolved, resolved + '.ts', resolved + '.tsx', resolved + '.js', path.join(resolved, 'index.ts')]
      if (!options.some(p => fs.existsSync(p) && fs.statSync(p).isFile())) {
        missing.add(path.relative(root, file) + ' -> ' + specifier)
      }
    }
  }
}
for (const name of packages) walk(path.join(root, name, 'src'))
if (filesChecked === 0) errors.push('No sources were found')
console.log('Scanned source files: ' + filesChecked + '; relative imports: ' + relativeImports)
console.log('External specifiers: ' + [...external].sort().join(', '))
for (const issue of errors) console.error('ERROR: ' + issue)
for (const issue of [...missing].sort()) console.error('MISSING: ' + issue)
if (errors.length || missing.size) process.exitCode = 1
else console.log('PASS: relative import paths are present. Build and runtime unverified.')
