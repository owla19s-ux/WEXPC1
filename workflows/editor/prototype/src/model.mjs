// WEX-owned editor draft: no imports from React Flow.
// Deliberately not a finalized workflow execution protocol.
export const initialDraft = Object.freeze({
  revision: 0,
  nodes: [
    { id: 'start', type: 'task-pool', title: '任务入口', config: {}, position: { x: 50, y: 160 } },
    { id: 'execute', type: 'ai', title: 'AI 执行', config: {}, position: { x: 350, y: 160 } },
    { id: 'review', type: 'review', title: '审查', config: {}, position: { x: 650, y: 160 } },
    { id: 'decision', type: 'condition', title: '结果判断', config: {}, position: { x: 950, y: 160 } },
  ],
  edges: [
    { id: 'start-execute', source: 'start', target: 'execute' },
    { id: 'execute-review', source: 'execute', target: 'review' },
    { id: 'review-decision', source: 'review', target: 'decision' },
  ],
  viewport: { x: 0, y: 0, zoom: 0.8 },
})
export function applyEdit(draft, edit) {
  if (edit.baseRevision !== draft.revision) throw new Error('编辑版本冲突')
  const next = structuredClone(draft)
  switch (edit.kind) {
    case 'rename-node': {
      const node = next.nodes.find((n) => n.id === edit.nodeId)
      if (!node) throw new Error('节点不存在')
      if (typeof edit.title !== 'string' || !edit.title.trim()) throw new Error('标题不能为空')
      node.title = edit.title.trim()
      break
    }
    case 'move-node': {
      const node = next.nodes.find((n) => n.id === edit.nodeId)
      if (!node) throw new Error('节点不存在')
      if (!Number.isFinite(edit.position?.x) || !Number.isFinite(edit.position?.y)) throw new Error('坐标无效')
      node.position = { ...edit.position }
      break
    }
    case 'add-node': {
      if (!edit.node?.id || next.nodes.some((n) => n.id === edit.node.id)) throw new Error('节点 ID 冲突')
      if (!Number.isFinite(edit.node.position?.x) || !Number.isFinite(edit.node.position?.y)) throw new Error('节点坐标无效')
      next.nodes.push(structuredClone(edit.node))
      break
    }
    case 'remove-node':
      if (!next.nodes.some((n) => n.id === edit.nodeId)) throw new Error('节点不存在')
      next.nodes = next.nodes.filter((n) => n.id !== edit.nodeId)
      next.edges = next.edges.filter((e) => e.source !== edit.nodeId && e.target !== edit.nodeId)
      break
    case 'connect': {
      const { source, target } = edit
      if (!source || !target || source === target || !next.nodes.some((n) => n.id === source) || !next.nodes.some((n) => n.id === target)) throw new Error('无效连线')
      if (next.edges.some((e) => e.source === source && e.target === target)) throw new Error('连线已存在')
      next.edges.push({ id: edit.id ?? `${source}-${target}`, source, target })
      break
    }
    case 'disconnect':
      if (!next.edges.some((e) => e.id === edit.edgeId)) throw new Error('连线不存在')
      next.edges = next.edges.filter((e) => e.id !== edit.edgeId)
      break
    case 'viewport':
      if (![edit.viewport?.x, edit.viewport?.y, edit.viewport?.zoom].every(Number.isFinite)) throw new Error('视口无效')
      next.viewport = { ...edit.viewport }
      break
    default: throw new Error('不支持的编辑操作')
  }
  next.revision++
  return next
}
export function toFlow(draft) {
  return {
    nodes: draft.nodes.map((n) => ({ id: n.id, type: 'wex', position: n.position, data: { label: n.title, kind: n.type } })),
    edges: draft.edges.map((e) => ({ ...e })),
  }
}
