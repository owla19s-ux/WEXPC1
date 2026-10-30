import test from 'node:test'
import assert from 'node:assert/strict'
import { initialDraft, applyEdit, toFlow } from './model.mjs'
test('edits do not mutate original draft', () => {
  const next = applyEdit(initialDraft, { kind: 'rename-node', baseRevision: 0, nodeId: 'review', title: '人工审查' })
  assert.equal(initialDraft.nodes[2].title, '审查')
  assert.equal(next.nodes[2].title, '人工审查')
  assert.equal(next.revision, 1)
})
test('stale revision rejected', () => assert.throws(() => applyEdit(initialDraft, { kind: 'rename-node', baseRevision: 9, nodeId: 'review', title: 'X' }), /冲突/))
test('connection validates endpoints', () => assert.throws(() => applyEdit(initialDraft, { kind: 'connect', baseRevision: 0, source: 'start', target: 'missing' }), /无效/))
test('deleting node removes incident edges', () => {
  const next = applyEdit(initialDraft, { kind: 'remove-node', baseRevision: 0, nodeId: 'execute' })
  assert.equal(next.edges.length, 1)
})
test('flow projection preserves stable IDs', () => assert.deepEqual(toFlow(initialDraft).nodes.map((n) => n.id), initialDraft.nodes.map((n) => n.id)))
