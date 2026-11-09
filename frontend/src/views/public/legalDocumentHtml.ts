import DOMPurify from 'dompurify'

export interface LegalTocItem {
  id: string
  text: string
  level: 2 | 3
}

/** 前端生成的标题锚点前缀;文档内容不得占用该前缀,避免与生成 id 冲突。 */
export const LEGAL_HEADING_ID_PREFIX = 'legal-h-'

/**
 * 净化法律文档 HTML,并为 h2/h3 分配锚点 id、产出目录。
 *
 * - id 在 DOMPurify 净化流程内(afterSanitizeAttributes 钩子)处理,净化输出直接交给 v-html,
 *   不做二次解析/序列化往返;
 * - 标题自带且通过 DOMPurify 校验的 id 原样保留(正文 `[..](#id)` 锚点继续有效),
 *   缺失、占用生成前缀或与已出现 id 重复时才生成 `legal-h-序号`;
 * - 非标题元素上以生成前缀开头的 id 会被移除,防止伪造重复 id 让目录跳错;
 * - `<template>` 会被 DOMPurify 保留,但其内容是惰性的、不会渲染,其中的标题不进目录。
 */
export function sanitizeLegalHtml(rawHtml: string): { html: string; toc: LegalTocItem[] } {
  const headings: Array<{ node: Element; id: string }> = []
  const seenIds = new Set<string>()
  let generated = 0

  const assignIds = (node: Element) => {
    const ownId = node.getAttribute('id')
    const isHeading = node.nodeName === 'H2' || node.nodeName === 'H3'
    // template.content 中的节点挂在独立 DocumentFragment 上(isConnected 为 false)
    const isInert = !node.isConnected || node.closest('template') !== null

    if (!isHeading || isInert) {
      if (ownId?.startsWith(LEGAL_HEADING_ID_PREFIX)) {
        node.removeAttribute('id')
      } else if (ownId) {
        seenIds.add(ownId)
      }
      return
    }

    let id = ownId && !ownId.startsWith(LEGAL_HEADING_ID_PREFIX) && !seenIds.has(ownId) ? ownId : ''
    if (!id) {
      do {
        id = `${LEGAL_HEADING_ID_PREFIX}${generated++}`
      } while (seenIds.has(id))
      node.setAttribute('id', id)
    }
    seenIds.add(id)
    headings.push({ node, id })
  }

  // 钩子是 DOMPurify 全局状态,只在本次同步净化期间挂载,结束即卸载
  DOMPurify.addHook('afterSanitizeAttributes', assignIds)
  let html: string
  try {
    html = DOMPurify.sanitize(rawHtml)
  } finally {
    DOMPurify.removeHook('afterSanitizeAttributes', assignIds)
  }

  // 子节点在父节点钩子之后才被净化,目录文字在净化完成后再读取,确保不含被移除的内容
  const toc: LegalTocItem[] = []
  for (const { node, id } of headings) {
    const text = node.textContent?.trim() || ''
    if (text) {
      toc.push({ id, text, level: node.nodeName === 'H3' ? 3 : 2 })
    }
  }
  return { html, toc }
}
