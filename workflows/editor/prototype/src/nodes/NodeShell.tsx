import React from 'react'
import { Handle, Position } from '@xyflow/react'

/** Presentation only: node data and edit authority remain in the WEX draft model. */
export default function NodeShell({ kind, title }: { kind: string; title: string }) {
  return <div className="node"><Handle type="target" position={Position.Left} /><small>{kind}</small><strong>{title}</strong><Handle type="source" position={Position.Right} /></div>
}
