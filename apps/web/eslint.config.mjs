// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import prettier from 'eslint-plugin-prettier'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  {
    // 忽略的文件和目录
    ignores: [
      '.next/**', // Next.js 构建输出
      'out/**', // 静态导出输出
      'dist/**', // 构建输出目录
      'build/**', // 构建输出目录
      'node_modules/**', // 依赖包
      '*.config.js', // 配置文件
      '*.config.ts', // TypeScript 配置文件
      '*.min.js', // 压缩文件
      '*.bundle.js', // 打包文件
    ],
  }, // 继承 Next.js 推荐的 ESLint 配置
  ...compat.extends('next/core-web-vitals', 'next/typescript'), // 继承 Prettier 配置，避免与 Prettier 冲突
  ...compat.extends('prettier'),
  {
    // 插件配置
    plugins: {
      prettier: prettier, // Prettier 格式化插件
    },
    // 规则配置
    rules: {
      // Prettier 相关规则
      'prettier/prettier': 'error', // 将 Prettier 错误作为 ESLint 错误显示

      // 箭头函数相关规则
      'arrow-body-style': 'off', // 允许箭头函数使用大括号，不强制要求省略
      'prefer-arrow-callback': 'off', // 不强制要求使用箭头函数作为回调

      // TypeScript 相关规则
      '@typescript-eslint/no-explicit-any': 'off', // 允许使用 any 类型，不强制要求指定具体类型
      '@typescript-eslint/no-unused-vars': 'off', // 允许未使用的变量

      // React 相关规则
      'react/no-unescaped-entities': 'off', // 允许在JSX中使用未转义的引号
    },
  },
  ...storybook.configs['flat/recommended'],
]

export default eslintConfig
