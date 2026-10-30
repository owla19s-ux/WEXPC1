import React from 'react'
import NodeShell from './NodeShell'
export default function ConditionNode({ title }: { title: string }) {
  return <NodeShell kind="condition" title={title} />
}
