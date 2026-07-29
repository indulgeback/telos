import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Vitest 配置
// 现有测试 (select.test.ts) 使用 react-dom/server 的 renderToString,
// 纯 Node 环境, 不需要 jsdom/happy-dom
export default defineConfig({
  test: {
    // 只跑 .test.ts / .test.tsx / .spec.ts (排除 node_modules / .next)
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    // 不 watch, 跑完即退出 (CI 友好)
    watch: false,
    // 默认 node 环境 (测试用 renderToString, 不需要浏览器 DOM)
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
