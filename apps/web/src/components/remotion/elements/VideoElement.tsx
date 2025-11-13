/**
 * 视频元素组件
 * 用于在 Remotion 中渲染视频资产
 */

import { OffthreadVideo, Sequence, useVideoConfig } from 'remotion'
import { ElementProps } from '../types'

export const VideoElement: React.FC<ElementProps> = ({ elem, asset, fps }) => {
  const { fps: videoFps } = useVideoConfig()
  const actualFps = fps || videoFps

  // 如果没有 asset，不渲染
  if (!asset) {
    return null
  }

  // 计算开始帧和持续帧数
  const startFrame = Math.floor((elem.start ?? 0) * actualFps)
  const durationInFrames = Math.floor(elem.length * actualFps)

  // 计算视频裁剪
  const trimBefore = elem.startFrom
    ? Math.floor(elem.startFrom * actualFps)
    : undefined
  const trimAfter = trimBefore
    ? trimBefore + durationInFrames
    : durationInFrames

  return (
    <Sequence from={startFrame} durationInFrames={durationInFrames}>
      <OffthreadVideo
        src={asset.src}
        style={{
          position: 'absolute',
          left: `${elem.x ?? 0}px`,
          top: `${elem.y ?? 0}px`,
          width: `${elem.width ?? 1080}px`,
          height: elem.height ? `${elem.height}px` : 'auto',
          transform: `scale(${elem.scaleX ?? 1}, ${elem.scaleY ?? 1}) rotate(${elem.rotate ?? 0}deg)`,
          transformOrigin: 'center center',
          opacity: elem.opacity ?? 1,
          objectFit: 'cover',
        }}
        trimBefore={trimBefore}
        trimAfter={trimAfter}
        volume={elem.volume ?? 1}
        muted={elem.volume === 0}
      />
    </Sequence>
  )
}
