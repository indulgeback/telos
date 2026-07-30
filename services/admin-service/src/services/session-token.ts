import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { config } from '../config/index.js'

// =============================================================================
// Admin Session Token (AES-256-GCM 加密)
// 参考 morph 的 session-token.service.ts, 不用 JWT (加密比签名更安全)
// 格式: iv.tag.ciphertext (三段 base64url, 用 . 分隔)
// =============================================================================

export interface AdminSessionClaims {
  version: 1
  role: 'admin'
  username: string
  issuedAt: string
  expiresAt: string
}

/** 签发 session token */
export function signSessionToken(username: string): string {
  const now = new Date()
  const expiry = new Date(now.getTime() + config.sessionTtlSeconds * 1000)

  const claims: AdminSessionClaims = {
    version: 1,
    role: 'admin',
    username,
    issuedAt: now.toISOString(),
    expiresAt: expiry.toISOString(),
  }

  const key = Buffer.from(config.sessionKey, 'hex')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(claims), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [iv, tag, ciphertext].map(part => part.toString('base64url')).join('.')
}

/** 验证 session token, 返回 claims 或 null */
export function verifySessionToken(token: string): AdminSessionClaims | null {
  try {
    const [ivRaw, tagRaw, ciphertextRaw] = token.split('.')
    if (!ivRaw || !tagRaw || !ciphertextRaw) return null

    const key = Buffer.from(config.sessionKey, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivRaw, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
      decipher.final(),
    ]).toString('utf8')

    const claims = JSON.parse(plaintext) as AdminSessionClaims
    if (claims.version !== 1 || claims.role !== 'admin' || !claims.username) return null
    if (new Date(claims.expiresAt).getTime() <= Date.now()) return null
    return claims
  } catch {
    return null
  }
}
