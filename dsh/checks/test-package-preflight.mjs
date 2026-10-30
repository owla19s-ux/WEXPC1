#!/usr/bin/env node
// Fixture tests for check-package-preflight.mjs; no packages or network required.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const script = fs.readFileSync(new URL('./check-package-preflight.mjs', import.meta.url), 'utf8')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wex-dsh-preflight-'))
try {
  const dsh = path.join(tmp, 'dsh')
  fs.mkdirSync(path.join(dsh, 'checks'), { recursive: true })
  fs.writeFileSync(path.join(dsh, 'checks', 'check-package-preflight.mjs'), script)
  const root = path.join(dsh, 'upstream')
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(path.join(root, 'tsconfig.base.json'), '{}')
  const names = ['cordis', 'loader', 'cosmokit', 'schemastery']
  for (const name of names) {
    const dir = path.join(root, 'vendor', name)
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true })
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@deepseek-ai/' + name }))
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}')
    fs.writeFileSync(path.join(dir, 'LICENSE'), 'MIT')
    fs.writeFileSync(path.join(dir, 'src', 'index.ts'), 'export {}')
  }
  const run = () => spawnSync(process.execPath, [path.join(dsh, 'checks', 'check-package-preflight.mjs')], { encoding: 'utf8' })
  assert.equal(run().status, 0, 'four valid packages should pass')
  const loader = path.join(root, 'vendor', 'loader', 'package.json')
  fs.writeFileSync(loader, JSON.stringify({name:'@deepseek-ai/loader',dependencies:{'@deepseek-ai/absent':'workspace:~'}}))
  const missingDep = run()
  assert.notEqual(missingDep.status, 0)
  assert.match(missingDep.stderr, /unavailable workspace package/)
  fs.writeFileSync(loader, JSON.stringify({name:'@deepseek-ai/loader'}))
  fs.rmSync(path.join(root, 'vendor', 'loader', 'LICENSE'))
  const missingLicense = run()
  assert.notEqual(missingLicense.status, 0)
  assert.match(missingLicense.stderr, /LICENSE/)
  console.log('PASS: manifest baseline, missing workspace dependency, missing license (3 cases)')
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}
