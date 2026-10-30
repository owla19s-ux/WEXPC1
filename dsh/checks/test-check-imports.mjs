#!/usr/bin/env node
// Regression tests for the vendor relative-import scanner, with no dependencies.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const source = fs.readFileSync(new URL('./check-imports.mjs', import.meta.url), 'utf8')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wex-dsh-import-check-'))
try {
  const folder = path.join(temp, 'dsh')
  fs.mkdirSync(path.join(folder, 'checks'), { recursive: true })
  fs.writeFileSync(path.join(folder, 'checks', 'check-imports.mjs'), source)
  for (const name of ['cordis', 'loader', 'cosmokit', 'schemastery']) {
    fs.mkdirSync(path.join(folder, 'upstream', 'vendor', name, 'src'), { recursive: true })
    fs.writeFileSync(path.join(folder, 'upstream', 'vendor', name, 'src', 'index.ts'), 'export const ok = true\n')
  }
  const run = () => spawnSync(process.execPath, [path.join(folder, 'checks', 'check-imports.mjs')], { encoding: 'utf8' })
  const pass = run()
  assert.equal(pass.status, 0, pass.stderr)
  assert.match(pass.stdout, /PASS:/)

  const entry = path.join(folder, 'upstream', 'vendor', 'loader', 'src', 'index.ts')
  fs.writeFileSync(entry, "export { found } from './found.ts'\n")
  fs.writeFileSync(path.join(path.dirname(entry), 'found.ts'), 'export const found = 1\n')
  assert.equal(run().status, 0, 'existing relative imports must pass')

  fs.writeFileSync(entry, "export { lost } from './missing.ts'\n")
  const fail = run()
  assert.notEqual(fail.status, 0, 'missing imports must fail')
  assert.match(fail.stderr, /MISSING:.*loader.*missing\.ts/)
  console.log('PASS: baseline, existing relative import, missing relative import (3 cases)')
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
