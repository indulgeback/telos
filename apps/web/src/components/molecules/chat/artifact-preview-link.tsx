'use client'

import dynamic from 'next/dynamic'
import {
  type AnchorHTMLAttributes,
  type ReactNode,
  useMemo,
  useState,
} from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/atoms'
import { cn } from '@/lib/utils'
import {
  Download,
  ExternalLink,
  Eye,
  FileText,
  Presentation,
  Sheet,
} from 'lucide-react'

const ArtifactFileViewer = dynamic(
  () =>
    import('./artifact-file-viewer').then(module => module.ArtifactFileViewer),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-[72vh] items-center justify-center text-sm text-muted-foreground'>
        Loading preview...
      </div>
    ),
  }
)

const PREVIEW_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'pdf',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
])

const IMAGE_EXTENSIONS = new Set([
  'apng',
  'avif',
  'bmp',
  'gif',
  'heic',
  'heif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
])

const MIME_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

interface FileLinkInfo {
  extension: string
  fileName: string
  mimeType?: string
}

interface ArtifactPreviewLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'children' | 'href'
> {
  href: string
  children: ReactNode
}

function getFileNameFromHref(href: string): string {
  try {
    const url = new URL(href, window.location.href)
    const pathName = url.pathname.split('/').filter(Boolean).pop()
    return decodeURIComponent(pathName || 'artifact')
  } catch {
    const pathName = href.split('?')[0]?.split('#')[0]?.split('/').pop()
    return decodeURIComponent(pathName || 'artifact')
  }
}

function getExtension(fileName: string): string {
  const cleanName = fileName.split('?')[0]?.split('#')[0] || fileName
  const match = /\.([a-zA-Z0-9]+)$/.exec(cleanName)
  return match?.[1]?.toLowerCase() || ''
}

export function getPreviewableFileLink(href?: string): FileLinkInfo | null {
  if (!href) return null

  const fileName = getFileNameFromHref(href)
  const extension = getExtension(fileName)

  if (!extension || IMAGE_EXTENSIONS.has(extension)) return null
  if (!PREVIEW_EXTENSIONS.has(extension)) return null

  return {
    extension,
    fileName,
    mimeType: MIME_BY_EXTENSION[extension],
  }
}

function getIcon(extension: string) {
  if (extension === 'xls' || extension === 'xlsx' || extension === 'csv') {
    return <Sheet className='size-4 text-emerald-600' />
  }

  if (extension === 'ppt' || extension === 'pptx') {
    return <Presentation className='size-4 text-orange-600' />
  }

  return <FileText className='size-4 text-blue-600' />
}

export function ArtifactPreviewLink({
  href,
  children,
  className,
  ...anchorProps
}: ArtifactPreviewLinkProps) {
  const [open, setOpen] = useState(false)
  const file = useMemo(() => getPreviewableFileLink(href), [href])

  if (!file) {
    return (
      <a
        className={className}
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        {...anchorProps}
      >
        {children}
      </a>
    )
  }

  return (
    <>
      <span
        className={cn(
          'not-prose my-2 inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-sm shadow-sm'
        )}
      >
        <span className='shrink-0'>{getIcon(file.extension)}</span>
        <span className='min-w-0 flex-1 truncate text-foreground'>
          {file.fileName}
        </span>
        <button
          type='button'
          className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          onClick={() => setOpen(true)}
          aria-label={`Preview ${file.fileName}`}
          title='Preview'
        >
          <Eye className='size-4' />
        </button>
        <a
          href={href}
          download={file.fileName}
          className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          aria-label={`Download ${file.fileName}`}
          title='Download'
        >
          <Download className='size-4' />
        </a>
        <a
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          aria-label={`Open ${file.fileName}`}
          title='Open'
        >
          <ExternalLink className='size-4' />
        </a>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[92vh] max-w-[94vw] gap-3 overflow-hidden p-4 sm:max-w-6xl'>
          <DialogHeader>
            <DialogTitle className='truncate pr-8 text-base'>
              {file.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className='overflow-hidden rounded-md border bg-background'>
            {open && (
              <ArtifactFileViewer
                url={href}
                fileName={file.fileName}
                mimeType={file.mimeType}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
