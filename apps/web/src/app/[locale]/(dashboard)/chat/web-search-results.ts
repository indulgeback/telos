export interface WebSearchResultItem {
  index: number
  title: string
  url: string
  snippet: string
  source: string
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * 解析 web_search 工具输出的 JSON 信封（见后端 buildWebSearchResultsOutput）。
 * 旧消息的输出是纯文本，解析失败返回 null，调用方回退到通用工具卡渲染。
 */
export function parseWebSearchOutput(
  outputText: string | undefined | null
): WebSearchResultItem[] | null {
  if (!outputText) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(outputText)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const envelope = parsed as { type?: unknown; results?: unknown }
  if (
    envelope.type !== 'web_search_results' ||
    !Array.isArray(envelope.results)
  ) {
    return null
  }
  const seen = new Set<string>()
  const items: WebSearchResultItem[] = []
  for (const raw of envelope.results) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    const url = typeof item.url === 'string' ? item.url : ''
    const title = typeof item.title === 'string' ? item.title : ''
    if (!url || !title || seen.has(url)) continue
    seen.add(url)
    items.push({
      index: typeof item.index === 'number' ? item.index : items.length + 1,
      title,
      url,
      snippet: typeof item.snippet === 'string' ? item.snippet : '',
      source:
        typeof item.source === 'string' && item.source
          ? item.source
          : safeHostname(url),
    })
  }
  return items.length > 0 ? items : null
}
