/**
 * 字幕元素组件
 * 用于在 Remotion 中渲染动态字幕（支持逐字显示）
 */

import { useCurrentFrame, useVideoConfig, Sequence } from 'remotion'
import { ElementProps } from '../types'

export const CaptionElement: React.FC<ElementProps> = ({ elem, fps }) => {
  const frame = useCurrentFrame()
  const { fps: videoFps } = useVideoConfig()
  const actualFps = fps || videoFps

  // 计算开始帧和持续帧数
  const startFrame = Math.floor((elem.start ?? 0) * actualFps)
  const durationInFrames = Math.floor(elem.length * actualFps)

  // 在 Sequence 内部，frame 是相对于 Sequence 开始的
  // 所以需要计算相对时间
  const relativeTime = frame / actualFps

  // 计算当前应该显示的文字
  let displayedText = elem.text || ''

  if (elem.words && elem.words.length > 0) {
    // 支持逐字动画
    displayedText = elem.words
      .filter(word => relativeTime >= word.start)
      .map(word => word.text)
      .join('')
  }

  // 样式配置
  const fontSize = elem.fontSize || 48
  const color = elem.color || '#ffffff'
  const fontFamily = elem.fontFamily || 'Arial, sans-serif'
  const textAlign = elem.textAlign || 'center'
  const fontWeight = elem.fontWeight || 'bold'

  return (
    <Sequence from={startFrame} durationInFrames={durationInFrames}>
      <div
        style={{
          position: 'absolute',
          left: `${elem.x ?? 0}px`,
          top: `${elem.y ?? 0}px`,
          width: `${elem.width ?? 1080}px`,
          height: elem.height ? `${elem.height}px` : 'auto',
          transform: `scale(${elem.scaleX ?? 1}, ${elem.scaleY ?? 1}) rotate(${elem.rotate ?? 0}deg)`,
          transformOrigin: 'center center',
          opacity: elem.opacity ?? 1,
          fontSize: `${fontSize}px`,
          color,
          fontFamily,
          textAlign,
          fontWeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            textAlign === 'center'
              ? 'center'
              : textAlign === 'right'
                ? 'flex-end'
                : 'flex-start',
          wordWrap: 'break-word',
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)', // 添加文字阴影提高可读性
          lineHeight: 1.2,
          zIndex: 1000, // 确保字幕在最顶层
          pointerEvents: 'none', // 字幕不阻挡鼠标事件
        }}
      >
        {displayedText}
      </div>
    </Sequence>
  )
}
