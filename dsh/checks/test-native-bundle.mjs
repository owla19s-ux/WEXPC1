// Run after dsh/runtime build. Tests actual native Bundle shape and bare-package Loader import.
// The patch parser covers this documented 'insert' subset only, NOT full DSH profile semantics.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'

const here = path.dirname(fileURLToPath(import.meta.url))
const dsh = path.resolve(here, '..')
const fixture = path.join(here, 'fixtures-native-bundle')
const manifest = JSON.parse(fs.readFileSync(path.join(fixture, 'package.json'), 'utf8'))
assert.equal(manifest.name, 'dsh-hello-plugin')
assert.ok(manifest.dsh?.bundle?.patch)
const patchPath = path.resolve(fixture, manifest.dsh.bundle.patch)
assert.ok(patchPath.startsWith(fixture + path.sep), 'patch must stay inside fixture')
const patch = fs.readFileSync(patchPath, 'utf8')
const match = patch.match(/^\s*- insert:\s*\n\s*- id: ([\w-]+)\s*\n\s*name: ([\w-]+)\s*$/)
assert.ok(match, 'expect exactly one simple native bundle insert patch')
const [, entryId, entryName] = match
assert.equal(entryName, manifest.name)

// An installed bundle is resolved by its package name, NOT a source-relative path.
// Create only an isolated, temporary node_modules link used by this test, remove it afterward.
const modules = path.join(dsh, 'node_modules')
fs.mkdirSync(modules, { recursive: true })
const link = path.join(modules, manifest.name)
assert.ok(!fs.existsSync(link), 'fixture package name must not already exist in dsh/node_modules')
fs.symlinkSync(fixture, link, process.platform === 'win32' ? 'junction' : 'dir')

const ctx = new Context()
let loaded = 0, disposed = 0
ctx.on('wex-test/hello-loaded', () => loaded++)
ctx.on('wex-test/hello-disposed', () => disposed++)
try {
  const owner = ctx.plugin(Loader, { baseUrl: import.meta.url })
  await owner.await()
  const loader = ctx.loader
  const id = await loader.create({ id: entryId, name: entryName })
  await loader.await()
  assert.ok(loader.resolve(id).moduleNamespace, 'real package imported')
  assert.equal(loaded, 1)
  const fiber = loader.resolve(id).fiber
  loader.remove(id)
  await fiber.dispose()
  assert.equal(disposed, 1)
  await owner.dispose()
  console.log('PASS: native Bundle manifest -> insert patch -> bare package name -> real Loader -> unload')
} finally {
  await ctx.fiber.dispose()
  fs.rmSync(link, { force: true })
}
