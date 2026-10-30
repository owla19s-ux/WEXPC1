import React, { useCallback, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ReactFlow, { Background, Controls, Handle, Position, type NodeProps, type NodeChange, type EdgeChange, type Connection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './style.css'
import { applyEdit, initialDraft, toFlow, type Draft, type Edit } from './model.mjs'

const KEY = 'wex-editor-spike-v1'
function readDraft(): Draft {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Draft> | null
    if (value && typeof value.revision === 'number' && Array.isArray(value.nodes) && Array.isArray(value.edges) && value.viewport) return value as Draft
  } catch { /* invalid saved draft resets to seed */ }
  return structuredClone(initialDraft)
}
function WexNodeView({ data }: NodeProps) {
  return <div className="node"><Handle type="target" position={Position.Left} /><small>{String(data.kind ?? 'step')}</small><strong>{String(data.label ?? '')}</strong><Handle type="source" position={Position.Right} /></div>
}
const nodeTypes = { wex: WexNodeView }
function App() {
  const [draft, setDraft] = useState<Draft>(readDraft)
  const [message, setMessage] = useState('本原型只编辑草稿，不执行任何任务')
  const [name, setName] = useState('')
  const flow = useMemo(() => toFlow(draft), [draft])
  const edit = useCallback((action: Omit<Edit, 'baseRevision'>) => {
    try {
      setDraft((current) => {
        const next = applyEdit(current, { ...action, baseRevision: current.revision } as Edit)
        localStorage.setItem(KEY, JSON.stringify(next))
        return next
      })
      setMessage('已修改草稿（未执行）')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '编辑失败')
    }
  }, [])
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position && !change.dragging) edit({kind: 'move-node', nodeId: change.id, position: change.position} as Omit<Edit, 'baseRevision'>)
      else if (change.type === 'remove') edit({kind: 'remove-node', nodeId: change.id} as Omit<Edit, 'baseRevision'>)
    }
  }, [edit])
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) if (change.type === 'remove') edit({kind:'disconnect', edgeId:change.id} as Omit<Edit, 'baseRevision'>)
  }, [edit])
  const onConnect = useCallback((connection: Connection) => {
    edit({kind:'connect', source:connection.source, target:connection.target} as Omit<Edit, 'baseRevision'>)
  }, [edit])
  const addReview = () => edit({kind:'add-node', node:{id:crypto.randomUUID(), type:'review', title:'新增审查', config:{}, position:{x:450,y:360}}} as Omit<Edit, 'baseRevision'>)
  const rename = () => { if (name.trim()) edit({kind:'rename-node', nodeId:'review', title:name} as Omit<Edit, 'baseRevision'>) }
  const reset = () => {const next=structuredClone(initialDraft); localStorage.setItem(KEY,JSON.stringify(next));setDraft(next);setMessage('草稿已重置')}
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
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
