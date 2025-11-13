/**
 * API 代理路由
 * 用于代理跨域资源请求
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: '缺少 URL 参数' }, { status: 400 })
    }

    // 安全检查：只允许代理特定域名
    const allowedDomains = [
      'd35ghwdno3nak3.cloudfront.net',
      'commondatastorage.googleapis.com',
      'via.placeholder.com',
      // 添加其他允许的域名
    ]

    const urlObj = new URL(url)
    const isAllowed = allowedDomains.some(domain =>
      urlObj.hostname.includes(domain)
    )

    if (!isAllowed) {
      return NextResponse.json({ error: '不允许代理该域名' }, { status: 403 })
    }

    // 发起代理请求
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Remotion-Proxy/1.0',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: '代理请求失败' },
        { status: response.status }
      )
    }

    // 获取响应数据
    const data = await response.arrayBuffer()
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream'

    // 返回代理的数据
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('代理错误:', error)
    return NextResponse.json({ error: '代理请求异常' }, { status: 500 })
  }
}
