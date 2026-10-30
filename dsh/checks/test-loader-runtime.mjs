// Real native ESM imports through Loader, no mocks or source TS execution.
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'

const root = new Context()
const ready = [], disposed = [], calls = [], cleaned = []
root.on('probe/ready', value => ready.push(value))
root.on('probe/disposed', value => disposed.push(value))
const consumer = Object.assign(ctx => {
  const value = ctx.runtimeProbe.ping()
  calls.push(value)
  ctx.effect(() => () => { cleaned.push(value) })
}, { inject: ['runtimeProbe'] })

try {
  const dependent = root.plugin(consumer)
  await dependent.await()
  assert.equal(root.runtimeProbe, undefined)
  assert.deepEqual(calls, [])
  const owner = root.plugin(Loader, { baseUrl: import.meta.url })
  await owner.await()
  assert.ok(root.loader)
  const loader = root.loader
  console.log('Loader module path: ' + (loader.internal?.version ?? 'native import fallback'))
  const id = await loader.create({ id: 'probe', name: './fixtures-service.mjs', config: { value: 'one' } })
  await loader.await()
  const entry = loader.resolve(id)
  assert.ok(entry.moduleNamespace, 'must have imported a real disk module')
  assert.ok(entry.fiber.uid, 'plugin owns a live fiber')
  await dependent.await()
  assert.equal(root.runtimeProbe.ping(), 'one')
  assert.deepEqual(ready, ['one'])
  assert.deepEqual(calls, ['one'])
  console.log('PASS: native disk module import, async Service init, dependency activation and call')

  await loader.update(id, { config: { value: 'two' } })
  await loader.await()
  await dependent.await()
  assert.equal(root.runtimeProbe.ping(), 'two')
  assert.deepEqual(ready, ['one', 'two'])
  assert.deepEqual(disposed, ['one'])
  assert.deepEqual(calls, ['one', 'two'])
  assert.deepEqual(cleaned, ['one'])
  console.log('PASS: config reload cleans old service and reactivates injected consumer')

  const previous = entry.fiber
  loader.remove(id)
  await previous.dispose()
  await dependent.await()
  assert.equal(root.runtimeProbe, undefined)
  assert.equal(root.runtimeProbe, undefined)
  assert.throws(() => loader.resolve(id), /cannot resolve entry/)
  assert.deepEqual(disposed, ['one', 'two'])
  assert.deepEqual(cleaned, ['one', 'two'])
  console.log('PASS: unload removes service/entry and suspends dependent')

  await loader.create({ id, name: './fixtures-service.mjs', config: { value: 'three' } })
  await loader.await()
  await dependent.await()
  assert.equal(root.runtimeProbe.ping(), 'three')
  assert.deepEqual(calls, ['one', 'two', 'three'])
  assert.deepEqual(ready, ['one', 'two', 'three'])
  const final = loader.resolve(id).fiber
  loader.remove(id)
  await final.dispose()
  await dependent.await()
  await dependent.dispose()
  await owner.dispose()
  assert.equal(root.loader, undefined)
  assert.equal(root.runtimeProbe, undefined)
  assert.deepEqual(disposed, ['one', 'two', 'three'])
  assert.deepEqual(cleaned, ['one', 'two', 'three'])
  console.log('PASS: same-id re-load, final unload and Loader service disposal')
} finally {
  await root.fiber.dispose()
}
