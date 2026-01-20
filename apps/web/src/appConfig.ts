const appConfig = {
  appName: 'Telos',
  baseDomain: process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:8800',
  locales: ['en', 'zh', 'tw', 'ko', 'ja', 'de', 'ru'],
  defaultLocale: 'en',
  subjectColor: '#22c55e', // 翡翠绿主题色 (hsl 160 65% 45%)
}

export default appConfig
