import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const dir = dirname(fileURLToPath(import.meta.url))
const sidebarSource = readFileSync(resolve(dir, '../AppSidebar.vue'), 'utf8')
const brandMarkSource = readFileSync(resolve(dir, '../../brand/BrandMark.vue'), 'utf8')
const useBrandSource = readFileSync(resolve(dir, '../../../composables/useBrand.ts'), 'utf8')
const homeViewSource = readFileSync(resolve(dir, '../../../views/HomeView.vue'), 'utf8')
const keyUsageViewSource = readFileSync(resolve(dir, '../../../views/KeyUsageView.vue'), 'utf8')

const DIRECT_SANITIZE = 'sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo'

/**
 * 站点 Logo 只有两条合法渲染路径：
 * 1. 组件内直接用 sanitizeUrl 清洗（必须带 allowRelative / allowDataUrl）；
 * 2. 交给 BrandMark / useBrand（useBrand 内部统一清洗），且组件不再直接读取 store 中的原始 Logo。
 */
function expectSanitizedSiteLogo(source: string) {
  if (source.includes(DIRECT_SANITIZE)) {
    expect(source).toContain("import { sanitizeUrl } from '@/utils/url'")
    expect(source).toContain('allowRelative: true')
    expect(source).toContain('allowDataUrl: true')
    return
  }
  expect(source).toMatch(/<BrandMark|useBrand\(\)/)
  expect(source).not.toMatch(/appStore\.(siteLogo|cachedPublicSettings\?\.site_logo)/)
}

describe('site_logo sanitization', () => {
  it('useBrand sanitizes the configured logo with relative and data URLs allowed', () => {
    expect(useBrandSource).toContain("import { sanitizeUrl } from '@/utils/url'")
    expect(useBrandSource).toContain(DIRECT_SANITIZE)
    expect(useBrandSource).toContain('allowRelative: true')
    expect(useBrandSource).toContain('allowDataUrl: true')
  })

  it('BrandMark renders only the sanitized logo from useBrand', () => {
    expect(brandMarkSource).toContain('useBrand()')
    expect(brandMarkSource).toMatch(/:src="siteLogo"/)
    expect(brandMarkSource).not.toContain('appStore')
  })

  // 侧边栏的 Logo 交给 BrandMark 渲染
  it('AppSidebar renders the logo through BrandMark', () => {
    expect(sidebarSource).toContain("import BrandMark from '@/components/brand/BrandMark.vue'")
    expect(sidebarSource).toContain('<BrandMark')
    expect(sidebarSource).not.toMatch(/:src="[^"]*siteLogo/)
    expectSanitizedSiteLogo(sidebarSource)
  })

  it('HomeView renders a sanitized site logo', () => {
    expectSanitizedSiteLogo(homeViewSource)
  })

  it('KeyUsageView renders a sanitized site logo', () => {
    expectSanitizedSiteLogo(keyUsageViewSource)
  })
})
