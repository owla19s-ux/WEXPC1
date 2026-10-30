export type Position = { x: number; y: number }
export type WexNode = { id: string; type: string; title: string; config: Record<string, unknown>; position: Position }
export type WexEdge = { id: string; source: string; target: string }
export type Draft = { revision: number; nodes: WexNode[]; edges: WexEdge[]; viewport: { x: number; y: number; zoom: number } }
export type Edit =
  | { kind: 'rename-node'; baseRevision: number; nodeId: string; title: string }
  | { kind: 'move-node'; baseRevision: number; nodeId: string; position: Position }
  | { kind: 'add-node'; baseRevision: number; node: WexNode }
  | { kind: 'remove-node'; baseRevision: number; nodeId: string }
  | { kind: 'connect'; baseRevision: number; id?: string; source: string; target: string }
  | { kind: 'disconnect'; baseRevision: number; edgeId: string }
  | { kind: 'viewport'; baseRevision: number; viewport: Draft['viewport'] }
export declare const initialDraft: Draft
export declare function applyEdit(draft: Draft, edit: Edit): Draft
export declare function toFlow(draft: Draft): { nodes: { id: string; type: 'wex'; position: Position; data: { label: string; kind: string } }[]; edges: WexEdge[] }
