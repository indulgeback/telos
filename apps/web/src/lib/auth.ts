import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { magicLink } from 'better-auth/plugins/magic-link'
import { prisma } from './db'

// 1. 动态安全加载 OAuth 提供商，避免空字符串静默失败
const socialProviders: Record<string, any> = {}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  }
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }
}
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  socialProviders.discord = {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  }
}
if (process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET) {
  socialProviders.slack = {
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
  }
}

// 2. 提前实例化 SMTP 传输对象，复用连接池 (避免冷启动超时与高并发连接重建开销)
let smtpTransporter: any = null
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  import('nodemailer')
    .then(nodemailer => {
      smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        pool: true, // 启用连接池
        maxConnections: 5,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    })
    .catch(err => {
      console.error('Failed to initialize SMTP transporter:', err)
    })
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:8800',
  basePath: '/api/auth',
  secret:
    process.env.BETTER_AUTH_SECRET || 'dev-secret-only-change-in-production',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  // 启用速率限制 (限流防刷防爆破)
  rateLimit: {
    enabled: true,
    window: 60, // 60 秒
    max: 20, // 全局默认每 IP 最多 20 次请求
    customRules: {
      '/magic-link': {
        window: 60,
        max: 2, // 限制每个 IP 或每个邮箱 1 分钟内最多请求发送 2 次 Magic Link
      },
    },
  },
  socialProviders,
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const hasEmailProvider = Boolean(
          process.env.RESEND_API_KEY || smtpTransporter
        )

        // 开发环境仍打印链接；配置了邮件通道时继续真实发信。
        if (process.env.NODE_ENV === 'development') {
          console.log(`\n========================================`)
          console.log(`[Better Auth] 登录魔术链接至: ${email}`)
          console.log(`验证 URL (15分钟有效): ${url}`)
          console.log(`========================================\n`)

          if (!hasEmailProvider) {
            return
          }
        }

        // 2. 选项 A：使用 Resend HTTP API 直发
        if (process.env.RESEND_API_KEY) {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: email,
                subject: '登录到 Telos',
                html: `<p>您好，</p><p>请点击以下链接登录您的 Telos 账户：</p><p><a href="${url}">${url}</a></p><p>此链接 15 分钟内有效。</p>`,
              }),
            })
            if (!res.ok) {
              const errorText = await res.text()
              throw new Error(`Resend API response error: ${errorText}`)
            }
          } catch (err) {
            console.error('[Resend] 发送魔术链接邮件失败:', err)
            throw err // 向上抛出，使 Better Auth 返回报错，通知前端用户
          }
          return
        }

        // 3. 选项 B：使用标准的 SMTP 发送
        if (smtpTransporter) {
          try {
            await smtpTransporter.sendMail({
              from:
                process.env.EMAIL_FROM || '"Telos Auth" <noreply@telos.com>',
              to: email,
              subject: '登录到 Telos',
              html: `<p>您好，</p><p>请点击以下链接登录您的 Telos 账户：</p><p><a href="${url}">${url}</a></p><p>此链接 15 分钟内有效。</p>`,
            })
          } catch (err) {
            console.error('[SMTP] 发送魔术链接邮件失败:', err)
            throw err // 向上抛出错误
          }
          return
        }

        // 若以上发件机制均未配置，则主动报错，避免静默降级
        throw new Error(
          'No email sending configuration found for magic link delivery'
        )
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7天
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    cookiePrefix: 'telos',
    skipTrailingSlashes: true,
    trustedOrigins: process.env.TRUSTED_ORIGINS
      ? process.env.TRUSTED_ORIGINS.split(',')
      : [],
  },
})
