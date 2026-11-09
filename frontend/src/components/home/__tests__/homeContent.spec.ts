import { describe, expect, it } from 'vitest'

import {
  DEMO_REQUESTS,
  ROUTE_CLIENTS,
  ROUTE_UPSTREAMS,
  buildSnippets,
  formatDemoCost,
  resolveApiRoot,
  snippetToText,
  splitCaretTail
} from '../homeContent'

const copy = {
  keyPlaceholder: 'sk-your-key',
  claudeComment: 'claude comment',
  codexComment: 'codex comment',
  codexEnvComment: 'codex env comment',
  pythonPrompt: 'Hello'
}

describe('resolveApiRoot', () => {
  it.each([
    ['https://52code.ai', 'https://52code.ai'],
    ['https://52code.ai/', 'https://52code.ai'],
    ['https://52code.ai/v1', 'https://52code.ai'],
    ['https://52code.ai/v1/', 'https://52code.ai'],
    ['https://52code.ai/v1beta', 'https://52code.ai'],
    ['  https://api.example.com/relay/v1  ', 'https://api.example.com/relay']
  ])('normalizes %s to %s', (input, expected) => {
    expect(resolveApiRoot(input)).toBe(expected)
  })
})

describe('buildSnippets', () => {
  const snippets = buildSnippets('https://52code.ai', '52code', copy)

  it('points Claude Code at the site root (client appends /v1/messages)', () => {
    const text = snippetToText(snippets.claude)
    expect(text).toContain('ANTHROPIC_BASE_URL="https://52code.ai"')
    expect(text).toContain('ANTHROPIC_AUTH_TOKEN="sk-your-key"')
  })

  it('uses the /v1 base for OpenAI-compatible clients', () => {
    expect(snippetToText(snippets.codex)).toContain('base_url = "https://52code.ai/v1"')
    expect(snippetToText(snippets.python)).toContain('base_url="https://52code.ai/v1"')
    expect(snippetToText(snippets.curl)).toContain('https://52code.ai/v1/messages')
  })

  it('never embeds anything but the placeholder key', () => {
    for (const lines of Object.values(snippets)) {
      const text = snippetToText(lines)
      expect(text).not.toMatch(/sk-(?!your-key)/)
    }
  })

  it('strips quotes from the site name in TOML', () => {
    const text = snippetToText(buildSnippets('https://x.dev', 'My "Relay"', copy).codex)
    expect(text).toContain('name = "My Relay"')
  })
})

describe('demo routing data', () => {
  it('only references existing clients and upstreams', () => {
    for (const request of DEMO_REQUESTS) {
      expect(ROUTE_CLIENTS[request.client]).toBeDefined()
      expect(ROUTE_UPSTREAMS[request.upstream]).toBeDefined()
    }
  })

  it('follows every 429 with a retry on the same upstream', () => {
    DEMO_REQUESTS.forEach((request, index) => {
      if (request.status !== 429) return
      const next = DEMO_REQUESTS[(index + 1) % DEMO_REQUESTS.length]
      expect(next.status).toBe(200)
      expect(next.retry).toBe(true)
      expect(next.upstream).toBe(request.upstream)
    })
  })

  it('formats demo costs', () => {
    expect(formatDemoCost(0.0184)).toBe('$0.0184')
    expect(formatDemoCost(0)).toBe('—')
  })
})

describe('splitCaretTail', () => {
  it('keeps the last character with the caret and flags full-width punctuation', () => {
    expect(splitCaretTail('接通每一个大模型。')).toEqual({
      head: '接通每一个大模型',
      tail: '。',
      cjk: true,
      fullWidthEnd: true
    })
  })

  it('treats CJK text without trailing punctuation as cjk only', () => {
    expect(splitCaretTail('现在开始')).toMatchObject({ head: '现在开', tail: '始', cjk: true, fullWidthEnd: false })
  })

  it('leaves Latin text on the alphabetic baseline', () => {
    expect(splitCaretTail('Wired to every model.')).toMatchObject({ tail: '.', cjk: false, fullWidthEnd: false })
  })

  it('handles empty text', () => {
    expect(splitCaretTail('')).toEqual({ head: '', tail: '', cjk: false, fullWidthEnd: false })
  })
})
