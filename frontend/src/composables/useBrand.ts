import { computed } from 'vue'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'
import { BRAND_DEFAULTS, resolveBrandName } from '@/utils/branding'

export { BRAND_DEFAULTS, isUnbrandedSiteName, resolveBrandName } from '@/utils/branding'

/**
 * 统一读取品牌信息（站点名 / Logo / 副标题 / 接入地址）。
 * 所有新 UI 应通过此组合式函数取品牌值，避免各处硬编码 fallback。
 */
export function useBrand() {
  const appStore = useAppStore()

  const siteName = computed(() =>
    resolveBrandName(appStore.cachedPublicSettings?.site_name || appStore.siteName)
  )

  const customLogo = computed(() =>
    sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', {
      allowRelative: true,
      allowDataUrl: true
    })
  )

  /** 是否使用管理员上传的自定义 Logo（否则渲染内置 52code 标识）。 */
  const hasCustomLogo = computed(() => customLogo.value.length > 0)

  const siteLogo = computed(() => customLogo.value || BRAND_DEFAULTS.logo)

  const siteSubtitle = computed(
    () => appStore.cachedPublicSettings?.site_subtitle?.trim() || BRAND_DEFAULTS.tagline
  )

  /**
   * 对外展示的 API 接入地址：优先后台配置的 api_base_url，其次当前访问域名。
   * 末尾斜杠会被去掉，便于拼接 /v1。
   */
  const apiBaseUrl = computed(() => {
    const configured = (appStore.cachedPublicSettings?.api_base_url || appStore.apiBaseUrl || '').trim()
    const base = configured || (typeof window !== 'undefined' ? window.location.origin : BRAND_DEFAULTS.url)
    return base.replace(/\/+$/, '')
  })

  return { siteName, siteLogo, hasCustomLogo, siteSubtitle, apiBaseUrl }
}
