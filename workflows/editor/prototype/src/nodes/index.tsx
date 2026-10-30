import React from 'react'
import type { NodeProps } from '@xyflow/react'
import TaskPoolNode from './TaskPoolNode'
import AiNode from './AiNode'
import ReviewNode from './ReviewNode'
import ConditionNode from './ConditionNode'
import NodeShell from './NodeShell'

/** Keep one React Flow projection type; WEX owns the domain kind. */
export function WexNodeView({ data }: NodeProps) {
  const title = String(data.label ?? '')
  switch (data.kind) {
    case 'task-pool': return <TaskPoolNode title={title} />
    case 'ai': return <AiNode title={title} />
    case 'review': return <ReviewNode title={title} />
    case 'condition': return <ConditionNode title={title} />
    default: return <NodeShell kind={String(data.kind ?? 'step')} title={title} />
  }
}

export const nodeTypes = { wex: WexNodeView }
