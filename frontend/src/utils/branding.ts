import { sanitizeUrl } from '@/utils/url'

/**
 * 52code 品牌默认值。
 * 后端未配置站点名时会回传上游默认值 "Sub2API"，前端将其视为「未配置」并回退到 52code。
 */
export const BRAND_DEFAULTS = {
  name: '52code',
  domain: '52code.ai',
  url: 'https://52code.ai',
  logo: '/logo.svg',
  tagline: 'AI API Gateway'
} as const

const UPSTREAM_DEFAULT_NAMES = new Set(['', 'sub2api'])

/** 判断站点名是否为空或仍是上游默认值。 */
export function isUnbrandedSiteName(name: string | null | undefined): boolean {
  return UPSTREAM_DEFAULT_NAMES.has((name || '').trim().toLowerCase())
}

/** 解析最终展示的站点名：管理员自定义值优先，否则使用 52code。 */
export function resolveBrandName(name: string | null | undefined): string {
  return isUnbrandedSiteName(name) ? BRAND_DEFAULTS.name : (name as string).trim()
}

export function updateFavicon(logoUrl: string): void {
  const sanitizedLogoUrl = sanitizeUrl(logoUrl, {
    allowRelative: true,
    allowDataUrl: true,
  })
  if (!sanitizedLogoUrl) {
    return
  }

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  link.type = sanitizedLogoUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
  link.href = sanitizedLogoUrl
}
