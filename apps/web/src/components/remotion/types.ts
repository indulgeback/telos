/**
 * Remotion 视频合成类型定义
 * 用于解析 project_data.json 数据结构
 */

// 资产类型（视频、图片、数字人、音频）
export type AssetType = 'video' | 'image' | 'avatar' | 'audio'

export interface Asset {
  id: string
  src: string
  type: AssetType
  originalWidth?: number
  originalHeight?: number
  duration?: number // 视频/音频时长（秒）
  transparent?: boolean // 数字人是否透明
  poster?: string // 视频封面
  srcset?: Array<{
    // 多分辨率资源
    src: string
    width: number
    height: number
  }>
  faceId?: string // 数字人 face ID
  faceAspectRatio?: string // 数字人宽高比
  loop?: boolean // 是否循环播放
  select_type?: string // 选择类型
  sourceType?: string // 来源类型
  score?: number // 评分
  generatedType?: string // 生成类型
  whetherGenerated?: boolean // 是否生成
  isClip?: boolean // 是否剪辑
  startFrom?: number // 起始时间
  style?: string // 样式
  musicId?: string // 音乐 ID
  [key: string]: unknown // 其他可能的字段
}

// 时间线元素类型
export type ElementType =
  | 'video'
  | 'image'
  | 'avatar'
  | 'caption'
  | 'audio'
  | 'voiceover'
  | 'scene'
  | 'text'
  | 'shape'

export interface Word {
  text: string
  start: number // 相对于字幕元素的开始时间（秒）
  end: number // 相对于字幕元素的结束时间（秒）
  duration?: number // 持续时间
}

export interface Track {
  id: string
  type?: string
  clips: Array<{ id: string }>
  hidden: boolean
}

export interface Animation {
  in?: {
    name: string
    duration?: number
  }
  out?: {
    name: string
    duration?: number
  }
}

export interface TimelineElement {
  id: string
  type: ElementType
  start?: number // 开始时间（秒）
  length: number // 时长（秒）
  x?: number // 位置 X（像素）
  y?: number // 位置 Y（像素）
  width?: number // 宽度（像素）
  height?: number // 高度（像素，可选）
  scaleX?: number // X 轴缩放
  scaleY?: number // Y 轴缩放
  rotate?: number // 旋转角度（度）
  assetId?: string // 关联的资产 ID

  // 场景特有字段
  parent?: string // 所属场景 ID
  specialType?: string // 特殊类型标记
  hidden?: boolean // 是否隐藏
  tracks?: Track[] // 场景的轨道
  templateId?: string // 模板 ID
  sceneName?: string // 场景名称
  avatar_track_index?: number // 数字人轨道索引
  background?: string // 背景

  // 字幕特有字段
  text?: string // 字幕文本
  words?: Word[] // 字幕逐字信息
  fontSize?: number // 字体大小
  fontFamily?: string // 字体
  color?: string // 颜色
  textAlign?: 'left' | 'center' | 'right' // 对齐方式
  fontWeight?: number | string // 字重
  templateStyle?: {
    name: string
  }

  // 视频/音频特有字段
  loop?: boolean // 是否循环
  startFrom?: number // 从视频的第几秒开始播放
  volume?: number // 音量 (0-1)
  assetFit?: string // 资产适应方式（contain_blur 等）

  // 语音旁白字段
  script?: string // 脚本文本
  accent?: string // 口音 ID
  voiceSync?: boolean // 语音同步

  // 形状字段
  shape?: string // 形状类型（circle, rounded 等）
  fill?: string // 填充颜色
  blur?: number // 模糊度

  // 文本字段
  style?: {
    fontFamily?: string
    fontSize?: string
    fontWeight?: number | string
    background?: string
    color?: string
    padding?: string
    textDecoration?: string
    fontStyle?: string
  }

  // 动画字段
  animation?: Animation

  // CTA 字段
  ctaName?: string

  // 其他字段
  opacity?: number // 透明度 (0-1)
  [key: string]: unknown // 其他可能的字段
}

// 完整项目数据类型
export interface ProjectData {
  acceptAspectRatios: string[] // 支持的宽高比，如 ["9x16", "16x9", "1x1"]
  timeline: {
    assets: Record<string, Asset> // 资产字典（key 为 assetId）
    elements: Record<string, TimelineElement> // 元素字典（key 为 elementId）
    background?: string // 背景颜色
    fonts?: any[] // 字体列表
    tracks?: Track[] // 顶级轨道
    transitions?: Record<string, any> // 转场效果
  }
  output?: {
    fps: number
    size: {
      width: number
      height: number
    }
    format: string
  }
  // 其他可能的字段
  fps?: number // 帧率，默认 30
  backgroundColor?: string // 背景颜色
  cache?: boolean
  tags?: string[]
  removeWatermark?: boolean
  withNewWatermark?: boolean
  smallWatermark?: boolean
  name?: string
  template?: string
  thumbnailFrame?: number
  renderIndex?: number
  variables?: Record<string, any>
  variablesUsed?: Record<string, any>
  [key: string]: unknown
}

// Remotion 组件 Props 类型
export interface VideoCompositionProps {
  data: ProjectData
}

export interface MainVideoProps {
  elements: TimelineElement[]
  assets: Record<string, Asset>
  width: number
  height: number
  fps: number
}

export interface ElementProps {
  elem: TimelineElement
  asset?: Asset
  fps: number
}

// 视频尺寸类型
export type AspectRatio = '9x16' | '16x9' | '1x1' | '4x3' | '21x9'

export interface VideoDimensions {
  width: number
  height: number
}
