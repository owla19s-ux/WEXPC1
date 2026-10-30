// Offline integrity check against blob ids read from the pinned upstream Git tree.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
const dsh = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(fs.readFileSync(path.join(dsh, 'upstream-files.json'), 'utf8'))
const expected = new Set(manifest.files.map(file => file.path))
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
    const file = path.join(dir, ent.name)
    return ent.isDirectory() ? walk(file) : [file]
  })
}
for (const file of walk(path.join(dsh, 'upstream'))) {
  const relative = path.relative(path.join(dsh, 'upstream'), file).split(path.sep).join('/')
  if (!expected.has(relative)) throw new Error('Untracked upstream file: ' + relative)
}
for (const { path: relative, gitBlob } of manifest.files) {
  const data = fs.readFileSync(path.join(dsh, 'upstream', relative))
  const actual = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex')
  if (actual !== gitBlob) throw new Error('Upstream mismatch: ' + relative)
}
console.log(`PASS: ${manifest.files.length} upstream files match ${manifest.repository}@${manifest.commit}`)
