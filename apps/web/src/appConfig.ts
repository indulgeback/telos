const appConfig = {
  appName: 'Telos',
  baseDomain: process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost:8800',
  locales: ['en', 'zh', 'tw', 'ko', 'ja', 'de', 'ru'],
  defaultLocale: 'en',
  subjectColor: '#4285F4', // Deep compute blue
}

export default appConfig
