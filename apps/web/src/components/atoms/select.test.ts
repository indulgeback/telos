import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

// 1. Mock 掉 Radix UI Select，以规避 React 双副本 Context / Hook 校验报错，确保可在纯 Node 环境下做 DOM 结构测试
vi.mock('@radix-ui/react-select', () => {
  return {
    Root: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-slot': 'select', ...props }, children),
    Group: ({ children, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-slot': 'select-group', ...props },
        children
      ),
    Value: ({ children, ...props }: any) =>
      React.createElement(
        'span',
        { 'data-slot': 'select-value', ...props },
        children
      ),
    Trigger: ({ children, ...props }: any) =>
      React.createElement(
        'button',
        { 'data-slot': 'select-trigger', ...props },
        children
      ),
    Icon: ({ children }: any) => children,
    Portal: ({ children }: any) => children,
    Content: ({ children, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-slot': 'select-content', ...props },
        children
      ),
    Viewport: ({ children }: any) => children,
    Item: ({ children, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-slot': 'select-item', ...props },
        children
      ),
    ItemText: ({ children }: any) => children,
    ItemIndicator: ({ children }: any) => children,
    ScrollUpButton: ({ children }: any) => children,
    ScrollDownButton: ({ children }: any) => children,
    Label: ({ children, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-slot': 'select-label', ...props },
        children
      ),
    Separator: ({ children, ...props }: any) =>
      React.createElement(
        'div',
        { 'data-slot': 'select-separator', ...props },
        children
      ),
  }
})

// 导入我们重写后的 Select 组件
import { Select, SelectTrigger, SelectValue } from './select'

describe('Select Component Tests', () => {
  it('should render SelectValue with pointer-events-none class', () => {
    // 检查 SelectValue 是否带有 pointer-events-none class，确保点击事件能穿透到 SelectTrigger
    const html = renderToString(
      React.createElement(
        Select,
        null,
        React.createElement(
          SelectTrigger,
          null,
          React.createElement(SelectValue, { className: 'test-class' })
        )
      )
    )

    expect(html).toContain('pointer-events-none')
    expect(html).toContain('test-class')
    expect(html).toContain('data-slot="select-value"')
  })

  it('should properly render placeholder and exclude children when agent/model is not selected', () => {
    // 验证条件渲染逻辑：当未选中时，不向 SelectValue 传入 false，避免 React 假子节点对 placeholder 的破坏
    const hasSelected = false
    const label = 'Test Name'
    const placeholder = 'Select Item'

    const renderedHtml = renderToString(
      React.createElement(
        Select,
        null,
        React.createElement(
          SelectTrigger,
          null,
          hasSelected
            ? React.createElement(SelectValue, null, label)
            : React.createElement(SelectValue, { placeholder })
        )
      )
    )

    // 验证此时应该只渲染含有 placeholder 属性的 SelectValue，并且没有 children 的脏值
    expect(renderedHtml).toContain(`placeholder="${placeholder}"`)
    expect(renderedHtml).not.toContain(label)
  })

  it('should properly render selected label inside SelectValue when agent/model is selected', () => {
    // 验证在已选中时，自定义的标签正确渲染在 SelectValue 的 children 中
    const hasSelected = true
    const label = 'Test Name'
    const placeholder = 'Select Item'

    const renderedHtml = renderToString(
      React.createElement(
        Select,
        null,
        React.createElement(
          SelectTrigger,
          null,
          hasSelected
            ? React.createElement(SelectValue, null, label)
            : React.createElement(SelectValue, { placeholder })
        )
      )
    )

    // 验证此时渲染出的是选中的内容，而不是 placeholder
    expect(renderedHtml).toContain(label)
    expect(renderedHtml).not.toContain(`placeholder="${placeholder}"`)
  })
})
