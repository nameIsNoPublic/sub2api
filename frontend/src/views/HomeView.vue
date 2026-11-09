<template>
  <!-- Custom Home Content: Full Page Mode -->
  <div v-if="hasHomeContent" class="min-h-screen">
    <!-- iframe mode -->
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <!-- HTML mode - SECURITY: homeContent is admin-only setting, XSS risk is acceptable -->
    <div v-else v-html="homeContent"></div>
  </div>

  <!-- Compact Home Page -->
  <div
    v-else-if="compactHomeEnabled"
    data-testid="compact-home"
    class="relative isolate flex min-h-screen flex-col bg-gray-50 text-gray-900 dark:bg-dark-950 dark:text-white"
  >
    <SignalField variant="ambient" class="absolute inset-0 -z-10" />

    <header
      class="border-b border-gray-200/80 bg-gray-50/70 px-4 py-3 backdrop-blur-md sm:px-6 dark:border-dark-800 dark:bg-dark-950/70"
    >
      <nav class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <BrandMark size="sm" />
        </div>
        <div class="flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1.5">
          <LocaleSwitcher />
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-950 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
            :title="t('home.viewDocs')"
            :aria-label="t('home.viewDocs')"
          >
            <Icon name="book" size="sm" />
          </a>
          <router-link
            v-if="showModelPlazaEntry"
            to="/model-plaza"
            class="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200/60 hover:text-gray-950 dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white"
            :title="t('nav.modelPlaza')"
          >
            <Icon name="grid" size="sm" />
            <span class="hidden sm:inline">{{ t('nav.modelPlaza') }}</span>
          </router-link>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-950 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
            :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')"
            @click="toggleTheme"
          >
            <Icon v-if="isDark" name="sun" size="sm" />
            <Icon v-else name="moon" size="sm" />
          </button>
          <router-link
            :to="isAuthenticated ? dashboardPath : '/login'"
            class="btn btn-ink btn-sm ml-1"
          >
            {{ isAuthenticated ? t('home.dashboard') : t('home.login') }}
          </router-link>
        </div>
      </nav>
    </header>

    <main class="flex min-w-0 flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div class="min-w-0 max-w-2xl text-center">
        <img
          :src="siteLogo || '/logo.svg'"
          alt="Logo"
          class="mx-auto mb-7 h-16 w-16 rounded-2xl object-contain shadow-pop"
        />
        <h1 class="text-4xl font-semibold tracking-tightest [overflow-wrap:anywhere] md:text-5xl">{{ siteName }}</h1>
        <p class="mt-4 whitespace-pre-wrap text-base leading-relaxed text-gray-600 [overflow-wrap:anywhere] dark:text-dark-300">{{ siteSubtitle }}</p>
        <router-link
          :to="isAuthenticated ? dashboardPath : '/login'"
          class="btn btn-ink btn-lg mt-8"
        >
          {{ isAuthenticated ? t('home.goToDashboard') : t('home.login') }}
          <Icon name="arrowRight" size="sm" :stroke-width="2" />
        </router-link>
      </div>
    </main>

    <footer
      class="min-w-0 border-t border-gray-200/80 px-4 py-5 text-center font-mono text-[11px] text-gray-500 [overflow-wrap:anywhere] sm:px-6 dark:border-dark-800 dark:text-dark-400"
    >
      &copy; {{ currentYear }} {{ siteName }}
    </footer>
  </div>

  <!-- Default Home Page：52code 落地页 -->
  <div
    v-else
    data-testid="home-default"
    class="relative min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-950 dark:text-gray-100"
  >
    <HomeHeader
      :is-authenticated="isAuthenticated"
      :dashboard-path="dashboardPath"
      :user-initial="userInitial"
      :doc-url="docUrl"
      :show-model-plaza-entry="showModelPlazaEntry"
      :is-dark="isDark"
      @toggle-theme="toggleTheme"
    />

    <main>
      <HomeHero
        :kicker="heroKicker"
        :api-root="apiRoot"
        :hub-name="brandHandle"
        :is-authenticated="isAuthenticated"
        :dashboard-path="dashboardPath"
        :show-model-plaza-entry="showModelPlazaEntry"
        :doc-url="docUrl"
      />
      <HomeQuickstart
        :api-root="apiRoot"
        :site-name="siteName"
        :registration-open="registrationOpen"
        :funding-mode="fundingMode"
      />
      <HomeCapabilities />
      <HomeCta
        :is-authenticated="isAuthenticated"
        :dashboard-path="dashboardPath"
        :show-model-plaza-entry="showModelPlazaEntry"
        :doc-url="docUrl"
        :registration-open="registrationOpen"
      />
    </main>

    <HomeFooter
      :is-authenticated="isAuthenticated"
      :dashboard-path="dashboardPath"
      :show-model-plaza-entry="showModelPlazaEntry"
      :doc-url="docUrl"
      :site-subtitle="siteSubtitle"
      :copyright-holder="brandHandle"
      :current-year="currentYear"
      :github-url="githubUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import BrandMark from '@/components/brand/BrandMark.vue'
import SignalField from '@/components/brand/SignalField.vue'
import HomeHeader from '@/components/home/HomeHeader.vue'
import HomeHero from '@/components/home/HomeHero.vue'
import HomeQuickstart from '@/components/home/HomeQuickstart.vue'
import HomeCapabilities from '@/components/home/HomeCapabilities.vue'
import HomeCta from '@/components/home/HomeCta.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'
import { resolveApiRoot, type HomeFundingMode } from '@/components/home/homeContent'
import { BRAND_DEFAULTS, useBrand } from '@/composables/useBrand'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled, resolveFeatureFlag } from '@/utils/featureFlags'
import { resolveSiteBillingMode } from '@/utils/siteBillingMode'

const { t } = useI18n()

const authStore = useAuthStore()
const appStore = useAppStore()

// Site settings - 品牌值统一来自 useBrand（未配置时回退 52code）
const { siteName, siteSubtitle, apiBaseUrl } = useBrand()
// 精简首页的大图标仍使用管理员 Logo（经 sanitizeUrl 过滤），未配置时回退 /logo.svg
const siteLogo = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const docUrl = computed(() => sanitizeUrl(appStore.cachedPublicSettings?.doc_url || appStore.docUrl || ''))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const hasHomeContent = computed(() => homeContent.value.trim().length > 0)
const compactHomeEnabled = computed(() => appStore.cachedPublicSettings?.compact_home_enabled === true)
const modelPlazaEnabled = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza))

// Check if homeContent is a URL (for iframe display)
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// 默认品牌显示「52code.ai」域名与「我爱 code」彩蛋；自定义品牌则显示站点名与副标题
const isDefaultBrand = computed(() => siteName.value === BRAND_DEFAULTS.name)
const brandHandle = computed(() => (isDefaultBrand.value ? BRAND_DEFAULTS.domain : siteName.value))
const heroKicker = computed(() =>
  isDefaultBrand.value
    ? `${t('ui52.home.hero.kicker')} · ${t('ui52.home.hero.kickerLove')}`
    : siteSubtitle.value
)
// 对外展示的接入根地址（去掉 /v1、/v1beta 后缀，由各协议自行拼接）
const apiRoot = computed(() => resolveApiRoot(apiBaseUrl.value))
// 三步接入第 1 步的文案依据：是否开放注册、支付是否开启及计费模式
const registrationOpen = computed(() => appStore.cachedPublicSettings?.registration_enabled === true)
const fundingMode = computed<HomeFundingMode>(() => {
  if (!resolveFeatureFlag(appStore.cachedPublicSettings, FeatureFlags.payment)) return 'redeem'
  return resolveSiteBillingMode(appStore.cachedPublicSettings) === 'subscription_only' ? 'subscription' : 'topup'
})

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

// GitHub URL（上游开源项目署名）
const githubUrl = 'https://github.com/Wei-Shaw/sub2api'

// Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated)
const modelPlazaRequiresAuth = computed(
  () => appStore.cachedPublicSettings?.model_plaza_require_auth === true,
)
const showModelPlazaEntry = computed(
  () => modelPlazaEnabled.value && (isAuthenticated.value || !modelPlazaRequiresAuth.value),
)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => isAdmin.value ? '/admin/dashboard' : '/dashboard')
const userInitial = computed(() => {
  const user = authStore.user
  if (!user || !user.email) return ''
  return user.email.charAt(0).toUpperCase()
})

// Current year for footer
const currentYear = computed(() => new Date().getFullYear())

// Toggle theme
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

onMounted(() => {
  initTheme()

  // Check auth state
  authStore.checkAuth()

  // Ensure public settings are loaded (will use cache if already loaded from injected config)
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})
</script>
