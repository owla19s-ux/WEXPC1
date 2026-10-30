#!/usr/bin/env node
// Offline preflight for a pinned DSH vendored runtime source tree.
// Does not install dependencies or claim the code builds.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const upstream = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../upstream')
const required = ['cordis', 'loader', 'cosmokit', 'schemastery']
const errors = []
const warnings = []
const manifests = new Map()

for (const name of required) {
  const dir = path.join(upstream, 'vendor', name)
  for (const suffix of ['package.json', 'tsconfig.json', 'LICENSE', 'src/index.ts']) {
    if (!fs.existsSync(path.join(dir, suffix))) errors.push('MISSING vendor/' + name + '/' + suffix)
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    if (!pkg.name?.startsWith('@deepseek-ai/')) errors.push('Invalid package name: ' + name)
    manifests.set(pkg.name, pkg)
  } catch (error) {
    errors.push('Cannot parse vendor/' + name + '/package.json: ' + error.message)
  }
}
for (const [name, pkg] of manifests) {
  for (const [dep, version] of Object.entries({
    ...pkg.dependencies, ...pkg.peerDependencies,
  })) {
    if (typeof version === 'string' && version.startsWith('workspace:') && !manifests.has(dep)) {
      errors.push(name + ' requires unavailable workspace package ' + dep)
    }
  }
}
const rootCfg = path.join(upstream, 'tsconfig.base.json')
if (!fs.existsSync(rootCfg)) errors.push('MISSING tsconfig.base.json')
if (manifests.size === required.length) {
  warnings.push('External registry packages, workspace install and TS compilation are NOT validated.')
  warnings.push('Plugin Manager / App Boot are partial snapshots and are not checked here.')
}
console.log('DSH pinned vendor preflight: checked ' + manifests.size + '/' + required.length + ' package manifests')
for (const w of warnings) console.log('NOTE: ' + w)
for (const e of errors) console.error('ERROR: ' + e)
if (errors.length) process.exitCode = 1
else console.log('PASS: basic vendored package manifests and required file paths present (static only)')
