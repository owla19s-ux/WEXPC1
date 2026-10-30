import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, Controls, type NodeChange, type EdgeChange, type Connection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './style.css'
import { applyEdit, initialDraft, toFlow, type Draft, type Edit } from './model.mjs'
import { nodeTypes } from './nodes'

type EditAction = { [K in Edit['kind']]: Omit<Extract<Edit, { kind: K }>, 'baseRevision'> }[Edit['kind']]

const KEY = 'wex-editor-spike-v1'
function readDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Draft> | null
    if (value && typeof value.revision === 'number' && Array.isArray(value.nodes) && Array.isArray(value.edges) && value.viewport) return value as Draft
  } catch { /* invalid saved draft resets to seed */ }
  return structuredClone(initialDraft)
}
export default function App() {
  const [draft, setDraft] = useState<Draft>(readDraft)
  const currentDraft = useRef(draft)
  const [message, setMessage] = useState('本原型只编辑草稿，不执行任何任务')
  const [name, setName] = useState('')
  // Selection belongs to the canvas, never to the persisted workflow draft.
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(() => new Set())
  const [selectedEdges, setSelectedEdges] = useState<Set<string>>(() => new Set())
  const flow = useMemo(() => {
    const projection = toFlow(draft)
    return {
      nodes: projection.nodes.map(node => ({ ...node, selected: selectedNodes.has(node.id) })),
      edges: projection.edges.map(edge => ({ ...edge, selected: selectedEdges.has(edge.id) })),
    }
  }, [draft, selectedNodes, selectedEdges])
  const edit = useCallback((action: EditAction) => {
    try {
      const current = currentDraft.current
      const next = applyEdit(current, { ...action, baseRevision: current.revision } as Edit)
      localStorage.setItem(KEY, JSON.stringify(next))
      currentDraft.current = next
      setDraft(next)
      setMessage('已修改草稿（未执行）')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '编辑失败')
    }
  }, [])
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setSelectedNodes(previous => {
      const next = new Set(previous)
      for (const change of changes) {
        if (change.type === 'select') change.selected ? next.add(change.id) : next.delete(change.id)
        if (change.type === 'remove') next.delete(change.id)
      }
      return next
    })
    for (const change of changes) {
      if (change.type === 'position' && change.position) edit({kind: 'move-node', nodeId: change.id, position: change.position})
      else if (change.type === 'remove') edit({kind: 'remove-node', nodeId: change.id})
    }
  }, [edit])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setSelectedEdges(previous => {
      const next = new Set(previous)
      for (const change of changes) {
        if (change.type === 'select') change.selected ? next.add(change.id) : next.delete(change.id)
        if (change.type === 'remove') next.delete(change.id)
      }
      return next
    })
    for (const change of changes) if (change.type === 'remove') edit({kind:'disconnect', edgeId:change.id})
  }, [edit])
  const onConnect = useCallback((connection: Connection) => {
    edit({kind:'connect', source:connection.source, target:connection.target})
  }, [edit])
  const addReview = () => edit({kind:'add-node', node:{id:crypto.randomUUID(), type:'review', title:'新增审查', config:{}, position:{x:450,y:360}}})
  const rename = () => { if (name.trim()) edit({kind:'rename-node', nodeId:'review', title:name}) }
  const reset = () => {
    try {
      const next = structuredClone(initialDraft)
      localStorage.setItem(KEY, JSON.stringify(next))
      currentDraft.current = next
      setDraft(next)
      setSelectedNodes(new Set())
      setSelectedEdges(new Set())
      setMessage('草稿已重置')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '重置失败')
    }
  }
  return <main>
    <header><h1>WEX 工作流编辑器 · 独立验证</h1><span>草稿修订 {draft.revision}</span></header>
    <section className="toolbar">
      <button onClick={addReview}>新增审查节点</button>
      <input value={name} onChange={(event)=>setName(event.target.value)} placeholder="修改默认审查节点名称" />
      <button onClick={rename}>结构化修改名称</button>
      <button onClick={reset}>重置原型</button>
      <span role="status">{message}</span>
    </section>
    <div className="flow">
      <ReactFlow nodes={flow.nodes} edges={flow.edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        fitView nodesDraggable nodesConnectable elementsSelectable deleteKeyCode="Delete">
        <Background /><Controls />
      </ReactFlow>
    </div>
    <footer>画布数据保存在当前浏览器 localStorage；不接 WEX Context、磁盘、权限或任务调度。重启页面可恢复草稿。</footer>
  </main>
}
