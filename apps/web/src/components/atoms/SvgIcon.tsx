'use client'

import { createElement, type ReactNode, type SVGProps } from 'react'

import { getSvgComponent } from '@/lib/icons/svg-registry'
import { cn } from '@/lib/utils'

export interface SvgIconProps extends SVGProps<SVGSVGElement> {
  name: string
  fallback?: ReactNode
  size?: number | string
}

export function SvgIcon({
  name,
  className,
  fallback = null,
  size,
  ...props
}: SvgIconProps) {
  const sizeProps = size ? { width: size, height: size } : {}
  const IconComponent = getSvgComponent(name)

  if (!IconComponent) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SvgIcon] 未找到名称为 ${name} 的图标`)
    }
    return fallback
  }
  return createElement(IconComponent, {
    className: cn('inline-block', className),
    ...sizeProps,
    ...props,
  })
}
