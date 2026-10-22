import { describe, expect, it } from 'vitest'
import { parseWebSearchOutput } from './web-search-results'

const envelope = JSON.stringify({
  type: 'web_search_results',
  query: 'telos',
  results: [
    {
      index: 1,
      title: 'Telos docs',
      url: 'https://example.com/docs',
      snippet: 'Intro',
      source: 'example.com',
    },
    {
      index: 2,
      title: 'Duplicate',
      url: 'https://example.com/docs',
      snippet: 'Dup',
      source: 'example.com',
    },
    {
      index: 3,
      title: 'No source field',
      url: 'https://sub.other.com/page',
      snippet: '',
    },
  ],
  cite: '回答时请标注 [n]',
})

describe('parseWebSearchOutput', () => {
  it('parses the envelope, dedupes by url and fills fallback source', () => {
    const items = parseWebSearchOutput(envelope)
    expect(items).not.toBeNull()
    expect(items).toHaveLength(2)
    expect(items?.[0]).toMatchObject({
      index: 1,
      title: 'Telos docs',
      source: 'example.com',
    })
    expect(items?.[1].source).toBe('sub.other.com')
  })

  it('returns null for legacy plain-text outputs', () => {
    expect(
      parseWebSearchOutput('搜索查询: "telos"\n\n结果:\n\n[1] 标题: x')
    ).toBeNull()
  })

  it('returns null for malformed or unrelated payloads', () => {
    expect(parseWebSearchOutput(undefined)).toBeNull()
    expect(parseWebSearchOutput('not json {')).toBeNull()
    expect(parseWebSearchOutput('{"type":"other","results":[]}')).toBeNull()
    expect(
      parseWebSearchOutput('{"type":"web_search_results","results":[]}')
    ).toBeNull()
  })
})
