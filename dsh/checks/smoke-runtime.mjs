// Minimal real-runtime smoke test. No mocks: imports actual built vendored packages.
// Run from a Node workspace after building the pinned Cordis and Loader packages.
// Usage: node dsh/checks/smoke-runtime.mjs
import assert from 'node:assert/strict'

async function load(name) {
  try { return await import(name) }
  catch (error) {
    console.error('IMPORT_FAILURE ' + name + ': ' + error.message)
    process.exitCode = 2
    return null
  }
}
const cordis = await load('@deepseek-ai/cordis')
const loaderModule = await load('@deepseek-ai/cordis-plugin-loader')
if (!cordis || !loaderModule) {
  console.error('Built packages are required: install workspace dependencies and build vendor packages first.')
} else {
  const { Context, Service } = cordis
  const Loader = loaderModule.Loader ?? loaderModule.default
  assert.equal(typeof Context, 'function', 'Cordis Context export')
  assert.equal(typeof Service, 'function', 'Cordis Service export')
  assert.equal(typeof Loader, 'function', 'Cordis Loader export')
  const root = new Context()
  let disposed = false
  let invoked = false
  class SampleService extends Service {
    constructor(ctx) { super(ctx, 'wexSmokeService') }
    ping() { invoked = true; return 'ok' }
  }
  const consumer = Object.assign((ctx) => {
    assert.equal(ctx.wexSmokeService.ping(), 'ok')
    ctx.effect(() => () => { disposed = true })
  }, { inject: ['wexSmokeService'] })
  try {
    await root.plugin(SampleService)
    await root.plugin(consumer)
    assert.ok(invoked, 'Injected service must be callable')
    // Loader needs to mount without requesting an external plugin.
    await root.plugin(Loader, {})
    assert.ok(root.loader, 'Loader must register its context service')
    await root.fiber.dispose()
    assert.ok(disposed, 'Plugin disposer must run')
    console.log('PASS: Cordis service registration, injection, Loader mount, disposal')
  } catch (error) {
    console.error('RUNTIME_FAILURE: ' + (error?.stack ?? error))
    process.exitCode = 1
    try { await root.fiber.dispose() } catch {}
  }
}
