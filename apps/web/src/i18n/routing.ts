import { defineRouting } from 'next-intl/routing'
import appConfig from '@/appConfig'

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: appConfig.locales,

  // Used when no locale matches
  defaultLocale: appConfig.defaultLocale,

  // Used to infer the default locale
  localePrefix: 'as-needed',

  // Used to infer the default locale
  localeDetection: false,
})
