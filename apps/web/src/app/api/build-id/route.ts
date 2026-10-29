import { NextResponse } from 'next/server'

/** 当前前端构建版本。发布检测轮询此接口；绝不缓存，保证拿到实时值。 */
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID || null },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
