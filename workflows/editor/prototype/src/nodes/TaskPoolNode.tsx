import React from 'react'
import NodeShell from './NodeShell'
export default function TaskPoolNode({ title }: { title: string }) {
  return <NodeShell kind="task-pool" title={title} />
}
