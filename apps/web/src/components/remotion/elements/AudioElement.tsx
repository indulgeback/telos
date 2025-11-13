/**
 * 音频元素组件
 * 用于在 Remotion 中渲染音频轨道
 */

import { Html5Audio, Sequence, useVideoConfig } from 'remotion'
import { ElementProps } from '../types'

export const AudioElement: React.FC<ElementProps> = ({ elem, asset, fps }) => {
  const { fps: videoFps } = useVideoConfig()
  const actualFps = fps || videoFps

  // 如果没有 asset，不渲染
  if (!asset) {
    return null
  }

  // 计算开始帧和持续帧数
  const startFrame = Math.floor((elem.start ?? 0) * actualFps)
  const durationInFrames = Math.floor(elem.length * actualFps)

  // 计算音频裁剪
  const trimBefore = elem.startFrom
    ? Math.floor(elem.startFrom * actualFps)
    : undefined
  const trimAfter = trimBefore
    ? trimBefore + durationInFrames
    : durationInFrames

  return (
    <Sequence from={startFrame} durationInFrames={durationInFrames}>
      <Html5Audio
        src={asset.src}
        trimBefore={trimBefore}
        trimAfter={trimAfter}
        volume={elem.volume ?? 1}
        loop={elem.loop || false}
      />
    </Sequence>
  )
}
