// Actual built-app HTTP smoke check; deliberately not called a browser test.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '40173', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
let logs = ''
server.stdout.on('data', data => { logs += data })
server.stderr.on('data', data => { logs += data })
const stopped = new Promise(resolve => server.once('exit', resolve))
const base = 'http://127.0.0.1:40173'
try {
  let response
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error('Preview exited: ' + logs)
    try { response = await fetch(base, { signal: AbortSignal.timeout(1000) }); break } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  assert.ok(response, 'preview did not start: ' + logs)
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.ok(html.includes('<div id="root"></div>'))
  const assets = [...html.matchAll(/(?:src|href)="([^"\s]+\.(?:js|css))"/g)].map(match => match[1])
  assert.equal(assets.length, 2)
  for (const asset of assets) {
    const result = await fetch(new URL(asset, base), { signal: AbortSignal.timeout(3000) })
    assert.equal(result.status, 200, asset)
    assert.match(result.headers.get('content-type') ?? '', asset.endsWith('.js') ? /javascript/ : /text\/css/)
    const contents = await result.text()
    assert.ok(contents.length > 0)
    console.log(`PASS: HTTP 200 ${asset} (${contents.length} characters)`)
  }
  console.log('PASS: production HTML and JS/CSS served; browser interaction remains a separate gate')
} finally {
  server.kill('SIGTERM')
  await stopped
}
