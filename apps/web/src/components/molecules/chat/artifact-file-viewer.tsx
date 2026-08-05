'use client'

import {
  fallbackPlugin,
  officePlugin,
  pdfPlugin,
  textPlugin,
} from '@open-file-viewer/core'
import '@open-file-viewer/core/style.css'
import { FileViewer } from '@open-file-viewer/react'
import { xlsxViewerPlugin } from './xlsx-viewer-plugin'

interface ArtifactFileViewerProps {
  url: string
  fileName: string
  mimeType?: string
}

// 插件顺序：xlsx 自渲染优先（套 youmind 主题，避开微软 Office Online 的蓝色工具栏），
// 其余 office 文档（docx/pptx）仍走 officePlugin，pdf/text 走各自插件
const plugins = [
  xlsxViewerPlugin(),
  textPlugin(),
  pdfPlugin({ useFetchData: true }),
  officePlugin({
    pdf: {
      useFetchData: true,
    },
  }),
  fallbackPlugin(),
]

export function ArtifactFileViewer({
  url,
  fileName,
  mimeType,
}: ArtifactFileViewerProps) {
  return (
    <FileViewer
      file={url}
      fileName={fileName}
      mimeType={mimeType}
      width='100%'
      height='72vh'
      fit='contain'
      toolbar
      theme='auto'
      fallback='download'
      plugins={plugins}
    />
  )
}
