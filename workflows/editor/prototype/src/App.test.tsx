// DOM integration with the real React Flow component; this is not a browser test.
// jsdom supplies events/storage, but does not verify browser layout or dragging.
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

const KEY = 'wex-editor-spike-v1'
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('editor DOM integration', () => {
  it('renders four real flow nodes, adds, renames and restores a draft', async () => {
    const view = render(<App />)
    expect(document.querySelectorAll('.react-flow__node').length).toBe(4)
    fireEvent.click(screen.getByRole('button', { name: '新增审查节点' }))
    expect(document.querySelectorAll('.react-flow__node').length).toBe(5)
    fireEvent.change(screen.getByPlaceholderText('修改默认审查节点名称'), { target: { value: '人工复核' } })
    fireEvent.click(screen.getByRole('button', { name: '结构化修改名称' }))
    expect(screen.getByText('人工复核')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem(KEY)!).revision).toBe(2)
    view.unmount()
    render(<App />)
    expect(screen.getByText('人工复核')).toBeTruthy()
    expect(document.querySelectorAll('.react-flow__node').length).toBe(5)
  })

  it('selects a node and Delete removes the node plus its incident edges', async () => {
    render(<App />)
    const node = document.querySelector('[data-id="execute"].react-flow__node')!
    fireEvent.click(node)
    await waitFor(() => expect(node.classList.contains('selected')).toBe(true))
    fireEvent.keyDown(document, { key: 'Delete', code: 'Delete', keyCode: 46 })
    await waitFor(() => expect(document.querySelector('[data-id="execute"].react-flow__node')).toBeNull())
    fireEvent.keyUp(document, { key: 'Delete', code: 'Delete', keyCode: 46 })
    const draft = JSON.parse(localStorage.getItem(KEY)!)
    expect(draft.nodes.some((node: { id: string }) => node.id === 'execute')).toBe(false)
    expect(draft.edges).toHaveLength(1)
    expect(screen.getByRole('status').textContent).toBe('已修改草稿（未执行）')
  })

  it('failed storage write leaves the displayed and next edit revision consistent', () => {
    render(<App />)
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new DOMException('quota full', 'QuotaExceededError') })
    fireEvent.click(screen.getByRole('button', { name: '新增审查节点' }))
    expect(screen.getByText('草稿修订 0')).toBeTruthy()
    expect(screen.getByRole('status').textContent).not.toContain('已修改')
    setItem.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: '新增审查节点' }))
    expect(screen.getByText('草稿修订 1')).toBeTruthy()
    expect(document.querySelectorAll('.react-flow__node').length).toBe(5)
  })
  it('failed reset storage write keeps the current draft and subsequent edit intact', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '新增审查节点' }))
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('storage unavailable') })
    fireEvent.click(screen.getByRole('button', { name: '重置原型' }))
    expect(screen.getByText('草稿修订 1')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('storage unavailable')
    setItem.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: '新增审查节点' }))
    expect(screen.getByText('草稿修订 2')).toBeTruthy()
    expect(document.querySelectorAll('.react-flow__node').length).toBe(6)
  })

  it('keyboard movement enters the draft model and persists coordinates', async () => {
    render(<App />)
    const node = document.querySelector('[data-id="review"].react-flow__node')!
    fireEvent.click(node)
    await waitFor(() => expect(node.classList.contains('selected')).toBe(true))
    fireEvent.keyDown(node, { key: 'ArrowRight', code: 'ArrowRight' })
    await waitFor(() => {
      const draft = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      expect(draft?.nodes.find((node: { id: string }) => node.id === 'review').position.x).toBeGreaterThan(650)
    })
    const draft = JSON.parse(localStorage.getItem(KEY)!)
    expect(draft.nodes.every((node: object) => !('selected' in node))).toBe(true)
  })

})
