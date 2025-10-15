/**
 * Image optimization utilities for Next.js Image component
 */

export interface ImageLoaderProps {
  src: string
  width: number
  quality?: number
}

/**
 * Custom image loader for Next.js Image component
 * Adds width and quality parameters to image URLs
 */
export const imageLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps): string => {
  // For external URLs, return as-is
  if (src.startsWith('http')) {
    return src
  }
  const q = quality || 75
  return `${src}?w=${width}&q=${q}`
}

/**
 * Generate shimmer SVG for image placeholder
 * Creates a subtle animated gradient effect while images load
 */
export const shimmer = (w: number, h: number): string => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f6f7f8" offset="0%" />
      <stop stop-color="#edeef1" offset="20%" />
      <stop stop-color="#f6f7f8" offset="40%" />
      <stop stop-color="#f6f7f8" offset="100%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f6f7f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`

/**
 * Convert string to base64
 * Works in both browser and Node.js environments
 */
export const toBase64 = (str: string): string =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str)

/**
 * Generate blur data URL for image placeholder
 * Use with Next.js Image component's blurDataURL prop
 */
export const generateBlurDataURL = (w: number, h: number): string => {
  return `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`
}
