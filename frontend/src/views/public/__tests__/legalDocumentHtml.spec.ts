import { describe, expect, it } from 'vitest'
import DOMPurify from 'dompurify'

import { sanitizeLegalHtml } from '../legalDocumentHtml'

/** 把净化结果解析成 DOM,便于按 id 断言(仅测试侧解析)。 */
function parse(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

describe('sanitizeLegalHtml', () => {
  it('keeps a heading id authored in the document so in-body anchors keep working', () => {
    const { html, toc } = sanitizeLegalHtml(
      '<h2 id="terms">服务条款</h2><p><a href="#terms">见服务条款</a></p><h3>细则</h3>'
    )
    const root = parse(html)

    expect(root.querySelector('h2')?.id).toBe('terms')
    expect(root.querySelector('a')?.getAttribute('href')).toBe('#terms')
    expect(toc).toEqual([
      { id: 'terms', text: '服务条款', level: 2 },
      { id: 'legal-h-0', text: '细则', level: 3 }
    ])
    expect(root.querySelector('h3')?.id).toBe('legal-h-0')
  })

  it('strips generated-prefix ids from non-heading elements so TOC targets stay unique', () => {
    const { html, toc } = sanitizeLegalHtml(
      '<p id="legal-h-0">伪造锚点</p><div><span id="legal-h-1">x</span></div><h2>第一章</h2><h2>第二章</h2>'
    )
    const root = parse(html)

    expect(root.querySelector('p')?.hasAttribute('id')).toBe(false)
    expect(root.querySelector('span')?.hasAttribute('id')).toBe(false)
    expect(toc.map((item) => item.id)).toEqual(['legal-h-0', 'legal-h-1'])
    for (const { id } of toc) {
      expect(root.querySelectorAll(`#${id}`)).toHaveLength(1)
      expect(root.querySelector(`#${id}`)?.tagName).toBe('H2')
    }
  })

  it('skips headings inside <template> because they are never rendered', () => {
    // 前置段落:位于开头的 <template> 会被 HTML 解析器放进 <head>,DOMPurify 只返回 body
    const { html, toc } = sanitizeLegalHtml(
      '<p>前言</p><template><h2 id="draft-section">隐藏标题</h2><h3 id="legal-h-0">隐藏小节</h3></template><h2>可见标题</h2>'
    )

    // DOMPurify 默认保留 template:标题是被跳过而非被净化删除
    expect(html).toContain('<template>')
    expect(html).toContain('隐藏标题')
    expect(toc).toEqual([{ id: 'legal-h-0', text: '可见标题', level: 2 }])
    // 模板内伪造的生成前缀 id 被移除,页面上只有一个 legal-h-0
    expect(html).not.toContain('id="legal-h-0">隐藏小节')
    expect(parse(html).querySelector('h2#legal-h-0')?.textContent).toBe('可见标题')
  })

  it('regenerates heading ids that reuse the generated prefix or duplicate an earlier id', () => {
    const { toc } = sanitizeLegalHtml(
      '<h2 id="legal-h-0">A</h2><h2 id="dup">B</h2><h2 id="dup">C</h2>'
    )

    const ids = toc.map((item) => item.id)
    expect(ids[1]).toBe('dup')
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter((id) => id.startsWith('legal-h-'))).toHaveLength(2)
  })

  it('still sanitizes hostile markup and unloads its DOMPurify hook afterwards', () => {
    const { html, toc } = sanitizeLegalHtml(
      '<h2>标题<img src="x" onerror="alert(1)"><script>bad()</script></h2>'
    )

    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script')
    expect(toc).toEqual([{ id: 'legal-h-0', text: '标题', level: 2 }])
    // 钩子已卸载:其他调用方的净化结果不应被写入锚点 id
    expect(DOMPurify.sanitize('<h2>x</h2>')).toBe('<h2>x</h2>')
  })
})
