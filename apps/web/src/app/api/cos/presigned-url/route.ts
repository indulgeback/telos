import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import COS from 'cos-nodejs-sdk-v5'

// 定义允许上传的 MIME 类型及其对应后缀的白名单映射，防止文件欺骗和存储型 XSS
const ALLOWED_MIME_MAP: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
}

export async function POST(request: NextRequest) {
  try {
    // 1. 鉴权：校验用户 Session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // 2. 解析参数
    const body = await request.json().catch(() => ({}))
    const filename =
      typeof body.filename === 'string' ? body.filename.trim() : ''
    const contentType =
      typeof body.contentType === 'string'
        ? body.contentType.trim().toLowerCase()
        : ''

    if (!filename) {
      return NextResponse.json(
        { error: 'filename is required' },
        { status: 400 }
      )
    }

    if (!contentType) {
      return NextResponse.json(
        { error: 'contentType is required' },
        { status: 400 }
      )
    }

    // 3. 安全性校验：匹配 Content-Type 和后缀白名单
    const ext = filename.includes('.')
      ? filename.split('.').pop()?.toLowerCase()
      : ''
    if (
      !ext ||
      !ALLOWED_MIME_MAP[contentType] ||
      !ALLOWED_MIME_MAP[contentType].includes(ext)
    ) {
      return NextResponse.json(
        { error: 'Unsupported file type or extension mismatch' },
        { status: 400 }
      )
    }

    // 4. 读取私有 COS 配置（彻底去除带有 NEXT_PUBLIC_ 前缀的 fallback，确保服务端变量隔离）
    const secretId = process.env.COS_SECRET_ID || ''
    const secretKey = process.env.COS_SECRET_KEY || ''
    const bucket = process.env.COS_BUCKET || ''
    const region = process.env.COS_REGION || ''
    const prefix = process.env.COS_PREFIX || 'chat-images'
    const publicBaseUrl = process.env.COS_PUBLIC_BASE_URL || ''

    if (!secretId || !secretKey || !bucket || !region) {
      return NextResponse.json(
        { error: 'COS configuration is incomplete on server' },
        { status: 500 }
      )
    }

    // 5. 实例化并生成签名
    const cos = new COS({
      SecretId: secretId,
      SecretKey: secretKey,
    })

    const day = new Date().toISOString().slice(0, 10)
    const random = Math.random().toString(36).slice(2, 10)
    // 路径中加入 userId，用于资源所有权隔离和日志审计
    const key = `${prefix.replace(/\/$/, '')}/${day}/${userId}/${Date.now()}-${random}.${ext}`

    const uploadUrl = cos.getObjectUrl({
      Bucket: bucket,
      Region: region,
      Method: 'PUT',
      Key: key,
      Expires: 900, // 15分钟有效
      Sign: true,
      Headers: {
        'x-cos-acl': 'public-read',
        'Content-Type': contentType,
      },
    })

    const publicUrl = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `https://${bucket}.cos.${region}.myqcloud.com/${key}`

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    })
  } catch (error: any) {
    console.error('Failed to generate pre-signed URL:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
