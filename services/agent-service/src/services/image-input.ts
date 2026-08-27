import { decodeImageDataUrl, validateUrlSyntax } from './safe-fetch.js'

export const MAX_USER_IMAGE_PARTS = 4
export const MAX_USER_IMAGE_URL_LENGTH = 16_384
export const MAX_USER_IMAGE_URL_TOTAL_LENGTH = 32_768
export const MAX_USER_IMAGE_TOTAL_BYTES = 16 * 1024 * 1024

export function normalizeUserImageParts(parts: unknown) {
  const formatted: Array<{
    type: 'image_url'
    image_url: { url: string }
  }> = []
  let totalRemoteUrlLength = 0
  let totalDataBytes = 0

  if (!Array.isArray(parts)) return formatted

  for (const item of parts) {
    let url = ''
    if (typeof item === 'string') {
      url = item.trim()
    } else if (item && typeof item === 'object') {
      const candidate = item as Record<string, unknown>
      if (candidate.type === 'image_url') {
        if (typeof candidate.image_url === 'string') {
          url = candidate.image_url.trim()
        } else if (
          candidate.image_url &&
          typeof candidate.image_url === 'object' &&
          typeof (candidate.image_url as Record<string, unknown>).url ===
            'string'
        ) {
          url = (
            (candidate.image_url as Record<string, unknown>).url as string
          ).trim()
        }
      } else if (
        candidate.type === 'image' &&
        typeof candidate.url === 'string'
      ) {
        url = candidate.url.trim()
      }
    }
    if (!url) continue
    if (formatted.length >= MAX_USER_IMAGE_PARTS) {
      throw new Error('Too many image attachments')
    }

    if (url.toLowerCase().startsWith('data:')) {
      const image = decodeImageDataUrl(url)
      totalDataBytes += image.bytes.length
      if (totalDataBytes > MAX_USER_IMAGE_TOTAL_BYTES) {
        throw new Error('Image attachments exceed the maximum size')
      }
    } else {
      if (url.length > MAX_USER_IMAGE_URL_LENGTH) {
        throw new Error('Image URL exceeds the maximum length')
      }
      validateUrlSyntax(url)
      totalRemoteUrlLength += url.length
      if (totalRemoteUrlLength > MAX_USER_IMAGE_URL_TOTAL_LENGTH) {
        throw new Error('Image URLs exceed the maximum total length')
      }
    }

    formatted.push({
      type: 'image_url',
      image_url: { url },
    })
  }

  return formatted
}
