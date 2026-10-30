import React from 'react'
import NodeShell from './NodeShell'
export default function AiNode({ title }: { title: string }) {
  return <NodeShell kind="ai" title={title} />
}
