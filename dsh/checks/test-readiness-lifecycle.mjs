// Batch-six real Cordis/Loader evidence. No WEX connector, paid model or third-party package.
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
const root = new Context()
const active = [], cleaned = []
const consumer = label => Object.assign(ctx => {
  active.push(`${label}:${ctx.runtimeProbe.ping()}`)
  ctx.effect(() => () => cleaned.push(label))
}, { inject: ['runtimeProbe'] })
try {
  const a = root.plugin(consumer('A')), b = root.plugin(consumer('B'))
  const owner = root.plugin(Loader, { baseUrl: import.meta.url })
  await owner.await()
  const loader = root.loader
  await loader.create({ id:'service', name:'./fixtures-service.mjs', config:{value:'v1'} })
  await loader.await(); await a.await(); await b.await()
  assert.deepEqual(active.sort(), ['A:v1','B:v1'])
  await a.dispose()
  assert.equal(root.runtimeProbe.ping(), 'v1', 'removing A must not remove B shared dependency')
  assert.deepEqual(cleaned, ['A'])
  const oldService = root.runtimeProbe
  // An external/async operation already issued is not cancelled by plugin disposal.
  let finish
  const inFlight = new Promise(resolve => { finish = () => resolve(oldService.ping()) })
  const fiber = loader.resolve('service').fiber
  loader.remove('service'); await fiber.dispose(); await b.await()
  assert.equal(root.runtimeProbe, undefined)
  assert.deepEqual(cleaned, ['A','B'])
  finish()
  assert.equal(await inFlight, 'v1', 'unload does not erase an outstanding reference/result')
  await loader.create({ id:'service', name:'./fixtures-service.mjs', config:{value:'v2'} })
  await loader.await(); await b.await()
  assert.notEqual(root.runtimeProbe, oldService)
  assert.equal(root.runtimeProbe.ping(), 'v2')
  assert.deepEqual(active, ['A:v1','B:v1','B:v2'])
  await b.dispose(); await owner.dispose()
  assert.equal(root.loader, undefined)
  assert.equal(root.runtimeProbe, undefined)
  console.log('PASS: two real injected consumers, selective dispose, dependency suspension, in-flight late result, new generation and cleanup')
} finally { await root.fiber.dispose() }
