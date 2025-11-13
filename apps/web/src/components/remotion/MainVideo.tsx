/**
 * 主视频渲染组件
 * 根据 JSON 数据渲染所有视觉和音频元素
 */

import { AbsoluteFill } from 'remotion'
import { MainVideoProps } from './types'
import { VideoElement } from './elements/VideoElement'
import { ImageElement } from './elements/ImageElement'
import { AvatarElement } from './elements/AvatarElement'
import { CaptionElement } from './elements/CaptionElement'
import { AudioElement } from './elements/AudioElement'

export const MainVideo = ({
  elements,
  assets,
  width,
  height,
  fps,
}: MainVideoProps) => {
  return (
    <AbsoluteFill
      style={{
        width,
        height,
        backgroundColor: '#000000',
        position: 'relative',
      }}
    >
      {/* 按层级顺序渲染：背景层 -> 内容层 -> 字幕层 */}

      {/* 背景层：视频、图片等 */}
      {elements
        .filter(elem => ['video', 'image', 'avatar'].includes(elem.type))
        .map(elem => {
          const asset = elem.assetId ? assets[elem.assetId] : undefined

          switch (elem.type) {
            case 'video':
              return (
                <VideoElement
                  key={elem.id}
                  elem={elem}
                  asset={asset}
                  fps={fps}
                />
              )
            case 'image':
              return (
                <ImageElement
                  key={elem.id}
                  elem={elem}
                  asset={asset}
                  fps={fps}
                />
              )
            case 'avatar':
              return (
                <AvatarElement
                  key={elem.id}
                  elem={elem}
                  asset={asset}
                  fps={fps}
                />
              )
            default:
              return null
          }
        })}

      {/* 音频层：不可见但需要渲染 */}
      {elements
        .filter(elem => ['audio', 'voiceover'].includes(elem.type))
        .map(elem => {
          const asset = elem.assetId ? assets[elem.assetId] : undefined
          return (
            <AudioElement key={elem.id} elem={elem} asset={asset} fps={fps} />
          )
        })}

      {/* 字幕层：最顶层，不被遮挡 */}
      {elements
        .filter(elem => elem.type === 'caption')
        .map(elem => (
          <CaptionElement key={elem.id} elem={elem} fps={fps} />
        ))}
    </AbsoluteFill>
  )
}
