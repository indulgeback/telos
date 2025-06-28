import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'zh'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Used to infer the default locale
  localePrefix: 'as-needed',

  // Used to infer the default locale
  localeDetection: false,
})
