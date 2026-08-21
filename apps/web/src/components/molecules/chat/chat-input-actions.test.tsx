import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/atoms', () => ({
  Button: ({ children, radius: _radius, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: () => <span />,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <span>{children}</span>,
  TooltipTrigger: ({ children }: any) => children,
}))

import { ChatInputActions } from './chat-input-actions'

const baseProps = {
  showImageUpload: true,
  showReasoningEffort: false,
  imageUploadLabel: 'Upload image',
  imageUploadDisabledLabel: 'Choose a vision model',
  imageUploadingLabel: 'Uploading...',
  reasoningEffort: 'minimal' as const,
  reasoningEffortLabel: 'Reasoning',
  reasoningEffortMinimal: 'Off',
  reasoningEffortLow: 'Low',
  reasoningEffortMedium: 'Medium',
  reasoningEffortHigh: 'High',
  disableReasoningEffort: false,
  onReasoningEffortChange: vi.fn(),
}

describe('ChatInputActions image upload', () => {
  it('keeps the image action visible but disabled for text-only models', () => {
    const html = renderToStaticMarkup(
      <ChatInputActions
        {...baseProps}
        imageUploadSupported={false}
        disableImageUpload
      />
    )

    expect(html).toContain('aria-label="Upload image"')
    expect(html).toContain('Choose a vision model')
    expect(html).toContain('type="file"')
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('enables both the visible action and file picker for vision models', () => {
    const html = renderToStaticMarkup(
      <ChatInputActions
        {...baseProps}
        imageUploadSupported
        disableImageUpload={false}
      />
    )

    expect(html).toContain('Upload image')
    expect(html).toContain('accept="image/*"')
    expect(html).not.toContain('Choose a vision model')
    expect(html).not.toContain('disabled=""')
  })
})
