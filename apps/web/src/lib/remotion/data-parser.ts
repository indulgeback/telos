/**
 * JSON 数据解析工具
 * 用于处理 project_data.json 并提取关键信息
 */

import {
  ProjectData,
  TimelineElement,
  Asset,
  VideoDimensions,
} from '@/components/remotion/types'

/**
 * 从 ProjectData 中提取所有时间线元素
 * 展开场景结构，将场景内的元素转换为绝对时间位置
 * 按照时间顺序排序
 */
export function getElements(data: ProjectData): TimelineElement[] {
  const allElements = Object.values(data.timeline.elements)
  const result: TimelineElement[] = []

  // 分离场景和非场景元素
  const scenes = allElements.filter(elem => elem.type === 'scene')
  const nonSceneElements = allElements.filter(elem => elem.type !== 'scene')

  // 如果有场景结构和顶级轨道，按轨道顺序处理场景
  if (scenes.length > 0 && data.timeline.tracks) {
    // 找到场景轨道
    const sceneTrack = data.timeline.tracks.find(
      track => track.type === 'scene'
    )

    if (sceneTrack && sceneTrack.clips) {
      let currentTime = 0

      // 按轨道中的顺序处理每个场景
      for (const clip of sceneTrack.clips) {
        const scene = scenes.find(s => s.id === clip.id)
        if (!scene) continue

        // 找到属于这个场景的所有元素
        const sceneElements = nonSceneElements.filter(
          elem => elem.parent === scene.id
        )

        // 将场景内的元素转换为绝对时间位置
        for (const elem of sceneElements) {
          result.push({
            ...elem,
            start: currentTime + (elem.start ?? 0), // 累计时间 + 元素相对时间
          })
        }

        // 累加场景时长
        currentTime += scene.length
      }

      // 处理其他轨道（音频、图片等）
      const otherTracks = data.timeline.tracks.filter(
        track => track.type !== 'scene'
      )
      for (const track of otherTracks) {
        if (track.clips) {
          for (const clip of track.clips) {
            const element = nonSceneElements.find(elem => elem.id === clip.id)
            if (element) {
              result.push({
                ...element,
                start: element.start ?? 0, // 使用元素自己的开始时间
              })
            }
          }
        }
      }
    } else {
      // 没有场景轨道，按场景本身的顺序处理
      for (const scene of scenes) {
        const sceneStart = scene.start ?? 0

        // 找到属于这个场景的所有元素
        const sceneElements = nonSceneElements.filter(
          elem => elem.parent === scene.id
        )

        // 将场景内的元素转换为绝对时间位置
        for (const elem of sceneElements) {
          result.push({
            ...elem,
            start: sceneStart + (elem.start ?? 0), // 场景开始时间 + 元素相对时间
          })
        }
      }
    }
  } else {
    // 没有场景结构，直接使用所有元素
    result.push(...nonSceneElements)
  }

  // 按开始时间排序，处理 undefined 的情况
  return result.sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
}

/**
 * 提取资产映射（assetId -> Asset）
 */
export const getAssetsMap = (data: ProjectData): Record<string, Asset> => {
  return data.timeline.assets
}

/**
 * 计算视频总时长（帧数）
 * 基于所有元素的结束时间
 */
export function getTotalDurationFrames(
  elements: TimelineElement[],
  fps: number
): number {
  if (elements.length === 0) return 30 * fps // 默认 30 秒

  const maxEndTime = Math.max(
    ...elements.map(elem => (elem.start ?? 0) + elem.length)
  )
  return Math.ceil(maxEndTime * fps)
}

/**
 * 计算视频总时长（秒）
 */
export const getTotalDurationInSeconds = (
  elements: TimelineElement[]
): number => {
  if (elements.length === 0) return 10 // 默认 10 秒

  const maxEndTime = Math.max(
    ...elements.map(elem => (elem.start ?? 0) + elem.length)
  )
  return Math.max(maxEndTime, 1) // 至少 1 秒
}

/**
 * 根据宽高比计算视频尺寸
 * 支持常见的视频宽高比
 * 优先使用 output.size，其次根据宽高比计算
 */
export function getVideoDimensions(
  aspectRatio: string,
  output?: ProjectData['output']
): VideoDimensions {
  // 如果有 output.size，优先使用
  if (output?.size) {
    return {
      width: output.size.width,
      height: output.size.height,
    }
  }

  const dimensionsMap: Record<string, VideoDimensions> = {
    '9x16': { width: 1080, height: 1920 }, // 竖屏视频（抖音、快手）
    '16x9': { width: 1920, height: 1080 }, // 横屏视频（YouTube）
    '1x1': { width: 1080, height: 1080 }, // 正方形（Instagram）
    '4x3': { width: 1440, height: 1080 }, // 传统电视比例
    '21x9': { width: 2560, height: 1080 }, // 超宽屏
  }

  return dimensionsMap[aspectRatio] || dimensionsMap['9x16']
}

/**
 * 获取帧率
 * 优先使用 output.fps，其次使用顶级 fps，最后默认 30
 */
export function getFps(data: ProjectData): number {
  return data.output?.fps || data.fps || 30
}

/**
 * 检查元素是否在当前帧可见
 */
export const isElementVisible = (
  elem: TimelineElement,
  currentFrame: number,
  fps: number
): boolean => {
  const startFrame = (elem.start ?? 0) * fps
  const endFrame = ((elem.start ?? 0) + elem.length) * fps

  return currentFrame >= startFrame && currentFrame <= endFrame
}

/**
 * 获取元素在当前帧的相对时间（秒）
 */
export const getRelativeTime = (
  elem: TimelineElement,
  currentFrame: number,
  fps: number
): number => {
  const startFrame = (elem.start ?? 0) * fps
  return Math.max(0, (currentFrame - startFrame) / fps)
}

/**
 * 处理 CDN URL（添加代理前缀避免跨域）
 */
export const processAssetUrl = (url: string, useProxy = false): string => {
  if (!url) return ''

  // 如果是相对路径，直接返回
  if (url.startsWith('/')) return url

  // 如果需要代理且是外部 URL
  if (useProxy && (url.startsWith('http://') || url.startsWith('https://'))) {
    // 将 URL 编码后通过代理访问
    const encodedUrl = encodeURIComponent(url)
    return `/api/proxy?url=${encodedUrl}`
  }

  return url
}

/**
 * 验证 JSON 数据结构
 */
export const validateProjectData = (data: unknown): data is ProjectData => {
  if (!data || typeof data !== 'object') return false

  const projectData = data as ProjectData

  // 必须有 timeline
  if (!projectData.timeline) return false

  // 必须有 assets 和 elements
  if (!projectData.timeline.assets || !projectData.timeline.elements)
    return false

  // 必须有至少一个宽高比
  if (
    !projectData.acceptAspectRatios ||
    projectData.acceptAspectRatios.length === 0
  ) {
    return false
  }

  return true
}

/**
 * 获取背景颜色
 */
export const getBackgroundColor = (data: ProjectData): string => {
  return data.backgroundColor || '#000000' // 默认黑色
}

/**
 * 按类型过滤元素
 */
export const getElementsByType = (
  elements: TimelineElement[],
  type: TimelineElement['type']
): TimelineElement[] => {
  return elements.filter(elem => elem.type === type)
}

/**
 * 获取音频元素（用于音频轨道）
 */
export const getAudioElements = (
  elements: TimelineElement[]
): TimelineElement[] => {
  return getElementsByType(elements, 'audio')
}

/**
 * 获取视觉元素（视频、图片、数字人、字幕）
 */
export const getVisualElements = (
  elements: TimelineElement[]
): TimelineElement[] => {
  return elements.filter(elem => elem.type !== 'audio')
}
