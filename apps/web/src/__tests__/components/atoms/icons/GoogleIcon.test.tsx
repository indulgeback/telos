/**
 * Google 图标组件单元测试
 */

import { render } from '@testing-library/react'
import { GoogleIcon } from '@/components/atoms/icons/GoogleIcon'

describe('GoogleIcon', () => {
  it('应该正确渲染', () => {
    const { container } = render(<GoogleIcon />)
    const svg = container.querySelector('svg')

    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
  })

  it('应该应用自定义尺寸', () => {
    const { container } = render(<GoogleIcon size={32} />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('height', '32')
  })

  it('应该使用默认尺寸', () => {
    const { container } = render(<GoogleIcon />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('width', '16')
    expect(svg).toHaveAttribute('height', '16')
  })

  it('应该应用自定义类名', () => {
    const { container } = render(<GoogleIcon className='custom-class' />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveClass('custom-class')
  })

  it('应该包含正确的 Google 品牌颜色', () => {
    const { container } = render(<GoogleIcon />)
    const paths = container.querySelectorAll('path')

    // 验证包含 Google 品牌的四种颜色
    expect(paths).toHaveLength(4)

    // 检查是否包含 Google 品牌颜色
    const pathElements = Array.from(paths)
    const fills = pathElements.map(path => path.getAttribute('fill'))

    expect(fills).toContain('#4285F4') // Google Blue
    expect(fills).toContain('#34A853') // Google Green
    expect(fills).toContain('#FBBC05') // Google Yellow
    expect(fills).toContain('#EA4335') // Google Red
  })

  it('应该包含正确的 SVG 属性', () => {
    const { container } = render(<GoogleIcon />)
    const svg = container.querySelector('svg')

    expect(svg).toHaveAttribute('fill', 'none')
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg')
  })
})
