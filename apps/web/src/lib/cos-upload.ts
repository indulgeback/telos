'use client'

interface CosUploadConfig {
  secretId: string
  secretKey: string
  securityToken?: string
  bucket: string
  region: string
  prefix: string
  publicBaseUrl?: string
}

declare global {
  interface Window {
    COS?: new (options: {
      SecretId: string
      SecretKey: string
      SecurityToken?: string
    }) => {
      putObject: (
        params: {
          Bucket: string
          Region: string
          Key: string
          Body: File
          ContentType?: string
          ACL?: 'private' | 'public-read'
        },
        callback: (err: Error | null, data: { statusCode?: number }) => void
      ) => void
    }
  }
}

function readCosConfig(): CosUploadConfig {
  const secretId = process.env.NEXT_PUBLIC_COS_SECRET_ID || ''
  const secretKey = process.env.NEXT_PUBLIC_COS_SECRET_KEY || ''
  const securityToken = process.env.NEXT_PUBLIC_COS_SECURITY_TOKEN || ''
  const bucket = process.env.NEXT_PUBLIC_COS_BUCKET || ''
  const region = process.env.NEXT_PUBLIC_COS_REGION || ''
  const prefix = process.env.NEXT_PUBLIC_COS_PREFIX || 'chat-images'
  const publicBaseUrl = process.env.NEXT_PUBLIC_COS_PUBLIC_BASE_URL || ''

  if (!secretId || !secretKey || !bucket || !region) {
    throw new Error(
      'COS config missing. Required: NEXT_PUBLIC_COS_SECRET_ID, NEXT_PUBLIC_COS_SECRET_KEY, NEXT_PUBLIC_COS_BUCKET, NEXT_PUBLIC_COS_REGION'
    )
  }

  return {
    secretId,
    secretKey,
    securityToken: securityToken || undefined,
    bucket,
    region,
    prefix,
    publicBaseUrl: publicBaseUrl || undefined,
  }
}

function ensureCosSdkLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('COS SDK is only available in browser'))
  }

  if (window.COS) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-sdk=\"cos-js-sdk-v5\"]'
    ) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load COS SDK'))
      )
      return
    }

    const script = document.createElement('script')
    script.src =
      'https://cdn.jsdelivr.net/npm/cos-js-sdk-v5/dist/cos-js-sdk-v5.min.js'
    script.async = true
    script.setAttribute('data-sdk', 'cos-js-sdk-v5')
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load COS SDK'))
    document.head.appendChild(script)
  })
}

function buildFileKey(prefix: string, filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop() : 'jpg'
  const day = new Date().toISOString().slice(0, 10)
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix.replace(/\/$/, '')}/${day}/${Date.now()}-${random}.${ext}`
}

export async function uploadImageToCos(file: File): Promise<string> {
  const cfg = readCosConfig()
  await ensureCosSdkLoaded()
  if (!window.COS) throw new Error('COS SDK is not available')

  const cos = new window.COS({
    SecretId: cfg.secretId,
    SecretKey: cfg.secretKey,
    SecurityToken: cfg.securityToken,
  })

  const key = buildFileKey(cfg.prefix, file.name)

  await new Promise<void>((resolve, reject) => {
    cos.putObject(
      {
        Bucket: cfg.bucket,
        Region: cfg.region,
        Key: key,
        Body: file,
        ContentType: file.type || 'application/octet-stream',
        // Vision models fetch image from provider-side servers, so object must be readable.
        ACL: 'public-read',
      },
      (err, data) => {
        if (err) return reject(err)
        if (
          data?.statusCode &&
          data.statusCode >= 200 &&
          data.statusCode < 300
        ) {
          return resolve()
        }
        reject(new Error(`COS upload failed: ${data?.statusCode ?? 'unknown'}`))
      }
    )
  })

  if (cfg.publicBaseUrl) {
    return `${cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`
  }
  return `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com/${key}`
}
