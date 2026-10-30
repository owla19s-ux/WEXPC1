import React from 'react'
import NodeShell from './NodeShell'
export default function ReviewNode({ title }: { title: string }) {
  return <NodeShell kind="review" title={title} />
}
