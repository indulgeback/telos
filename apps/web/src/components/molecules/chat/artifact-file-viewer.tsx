'use client'

import {
  fallbackPlugin,
  officePlugin,
  pdfPlugin,
  textPlugin,
} from '@open-file-viewer/core'
import '@open-file-viewer/core/style.css'
import { FileViewer } from '@open-file-viewer/react'

interface ArtifactFileViewerProps {
  url: string
  fileName: string
  mimeType?: string
}

const plugins = [
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
