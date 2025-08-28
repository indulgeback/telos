/**
 * Molecules 组件 Mock
 */

import React from 'react'

export const CustomLink = ({ children, href, ...props }: any) => (
  <a href={href} {...props}>
    {children}
  </a>
)
