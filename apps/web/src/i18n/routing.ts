import { defineRouting } from 'next-intl/routing'
import appConfig from '@/appConfig'

export const routing = defineRouting({
  // 支持的所有语言列表
  locales: appConfig.locales,

  // 默认语言
  defaultLocale: appConfig.defaultLocale,

  // 语言前缀策略：
  // 'as-needed' - 默认语言不显示前缀，其他语言显示前缀
  // 'always' - 所有语言都显示前缀
  // 'never' - 所有语言都不显示前缀
  localePrefix: 'as-needed',

  // 是否启用自动语言检测
  // false - 不自动检测，使用默认语言或 URL 中的语言
  // true - 根据 Accept-Language 头自动检测
  localeDetection: false,
})
