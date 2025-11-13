/**
 * Remotion Root 组件
 * 定义所有 Composition 配置
 */

import { Composition } from 'remotion'
import { MainVideo } from './MainVideo'
import { ProjectData, MainVideoProps } from './types'
import {
  getElements,
  getAssetsMap,
  getTotalDurationFrames,
  getVideoDimensions,
  getFps,
} from '@/lib/remotion/data-parser'

interface RemotionRootProps {
  data: ProjectData
}

export const RemotionRoot: React.FC<RemotionRootProps> = ({ data }) => {
  // 解析数据
  const elements = getElements(data)
  const assets = getAssetsMap(data)
  const fps = getFps(data)
  const durationInFrames = getTotalDurationFrames(elements, fps)
  const dimensions = getVideoDimensions(data.acceptAspectRatios[0])

  return (
    <>
      <Composition
        id='MainVideo'
        component={MainVideo as any}
        durationInFrames={durationInFrames}
        fps={fps}
        width={dimensions.width}
        height={dimensions.height}
        defaultProps={{
          elements,
          assets,
          width: dimensions.width,
          height: dimensions.height,
          fps,
        }}
      />
    </>
  )
}
