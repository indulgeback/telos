'use client'

/**
 * 将图片上传至腾讯云 COS（安全模式）
 * 首先向 Next.js 服务端接口申请预签名的上传链接，接着使用 PUT 直传。
 *
 * @param file 待上传的文件对象
 * @returns 最终可公开访问的公网 URL
 */
export async function uploadImageToCos(file: File): Promise<string> {
  // 1. 调用 Next.js 服务端接口获取预签名 URL 及文件访问 URL
  const res = await fetch('/api/cos/presigned-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(errData.error || `获取预签名链接失败: ${res.status}`)
  }

  const { uploadUrl, publicUrl } = await res.json()

  // 2. 通过 PUT 直传至腾讯云 COS
  // 注：服务端生成预签名 URL 时绑定了以下 Headers，客户端发起 PUT 时必须完全匹配，否则会报 403 签名不匹配
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'x-cos-acl': 'public-read',
      'Content-Type': file.type || 'application/octet-stream',
    },
  })

  if (!uploadRes.ok) {
    throw new Error(`直传 COS 失败 (状态码: ${uploadRes.status})`)
  }

  // 3. 返回供前端展示的公网访问 URL
  return publicUrl
}
