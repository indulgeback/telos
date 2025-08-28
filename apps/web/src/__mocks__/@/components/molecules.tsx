/**
 * 分子组件模拟
 */

import React from 'react'

export const CustomLink = jest.fn(({ children, href, ...props }) => (
  <a href={href} {...props}>
    {children}
  </a>
))

export default {
  CustomLink,
}
