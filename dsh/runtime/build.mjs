// WEX-owned standalone harness. Never rewrites pinned upstream sources/manifests.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'

const here = path.dirname(fileURLToPath(import.meta.url))
const dsh = path.resolve(here, '..')
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < 24 || (major === 24 && minor < 9)) throw new Error('Node >=24.9.0 required by pinned DSH baseline')
const integrity = spawnSync(process.execPath, [path.join(dsh, 'checks/check-upstream.mjs')], { stdio: 'inherit' })
if (integrity.status !== 0) process.exit(integrity.status ?? 1)
const output = path.join(here, '.build')
const names = ['cosmokit', 'schemastery', 'cordis', 'loader']
const upstream = path.join(dsh, 'upstream/vendor')
const manifests = Object.fromEntries(await Promise.all(names.map(async name =>
  [name, JSON.parse(await fs.readFile(path.join(upstream, name, 'package.json'), 'utf8'))])))
await fs.rm(output, { recursive: true, force: true })
await fs.mkdir(output, { recursive: true })
const aliases = Object.fromEntries(names.map(name => [manifests[name].name, [path.join(upstream, name, 'src/index.ts')]]))
for (const name of names) {
  const target = path.join(output, name)
  await fs.mkdir(target, { recursive: true })
  const original = JSON.parse(await fs.readFile(path.join(upstream, name, 'tsconfig.json'), 'utf8'))
  const references = (original.references ?? []).map(ref => ({ path: path.join(output, path.basename(ref.path), 'tsconfig.json') }))
  await fs.writeFile(path.join(target, 'tsconfig.json'), JSON.stringify({
    extends: path.join(upstream, name, 'tsconfig.json'),
    compilerOptions: {
      outDir: path.join(target, 'lib/types'),
      tsBuildInfoFile: path.join(target, 'build.tsbuildinfo'),
      emitDeclarationOnly: false,
      typeRoots: [path.join(here, 'node_modules/@types')],
      paths: { ...aliases, '@standard-schema/spec': [path.join(here, 'node_modules/@standard-schema/spec/dist/index.d.ts')] },
    },
    references,
  }, null, 2))
}
const result = spawnSync(process.execPath, [path.join(here, 'node_modules/typescript/bin/tsc'), '-b', ...names.map(name => path.join(output, name, 'tsconfig.json')), '--pretty', 'false'], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)
console.log('PASS: TypeScript project compilation (cosmokit, schemastery, Cordis Core, Loader)')
for (const name of names) {
  const target = path.join(output, name)
  const formats = name === 'schemastery' ? [['esm', 'index.mjs'], ['cjs', 'index.cjs']] : [['esm', 'index.js']]
  for (const [format, filename] of formats) await build({
    entryPoints: [path.join(target, 'lib/types/index.js')],
    outfile: path.join(target, 'lib', filename), bundle: true, platform: 'node',
    target: 'node24', format, packages: 'external', sourcemap: true,
  })
  await fs.writeFile(path.join(target, 'package.json'), JSON.stringify(manifests[name], null, 2))
  await fs.copyFile(path.join(upstream, name, 'LICENSE'), path.join(target, 'LICENSE'))
  const link = path.join(dsh, 'node_modules', manifests[name].name)
  await fs.mkdir(path.dirname(link), { recursive: true })
  await fs.rm(link, { recursive: true, force: true })
  await fs.symlink(target, link, process.platform === 'win32' ? 'junction' : 'dir')
  console.log(`PASS: built ${manifests[name].name}@${manifests[name].version}`)
}
