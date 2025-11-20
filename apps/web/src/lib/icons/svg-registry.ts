import type { ComponentType, SVGProps } from 'react'

// 使用 require.context 替代 import.meta.glob (Vite 特性)
// require.context 是 Webpack/Turbopack 支持的特性
const svgContext = require.context('../../assets/images/svgs', true, /\.svg$/)

export type SvgComponent = ComponentType<SVGProps<SVGSVGElement>>
export type SvgRegistry = Record<string, SvgComponent>

const normalizeSegment = (segment: string) =>
  segment
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

const buildRegistryName = (filePath: string) => {
  const normalizedPath = filePath
    .replace(/^.*assets\/images\/svgs\//, '')
    .replace(/^\.\//, '')
    .replace(/\.svg$/, '')
    .replace(/\\/g, '/')

  const kebabCasePath = normalizedPath
    .split('/')
    .filter(Boolean)
    .map(normalizeSegment)
    .join('-')

  return `icon-${kebabCasePath}`
}

export const svgRegistry: SvgRegistry = svgContext
  .keys()
  .reduce((registry: SvgRegistry, path: string) => {
    const mod = svgContext(path)
    const registryName = buildRegistryName(path)
    // 兼容 ES Module 和 CommonJS
    registry[registryName] = mod.default || mod
    return registry
  }, {} as SvgRegistry)

export const getSvgComponent = (svgName: string): SvgComponent | undefined => {
  const normalizedName = svgName.startsWith('icon-')
    ? svgName
    : `icon-${svgName}`
  return svgRegistry[normalizedName]
}

export const getAvailableSvgNames = () => Object.keys(svgRegistry)

if (process.env.NODE_ENV === 'development') {
  console.log('[SVG Registry] 已加载的图标:', getAvailableSvgNames().sort())
}
