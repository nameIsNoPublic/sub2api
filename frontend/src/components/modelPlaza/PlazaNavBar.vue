<template>
  <header
    class="sticky top-0 z-40 border-b border-gray-200/80 bg-gray-50/80 backdrop-blur-md supports-[backdrop-filter]:bg-gray-50/70 dark:border-dark-800 dark:bg-dark-950/80 dark:supports-[backdrop-filter]:bg-dark-950/70"
  >
    <nav
      class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8"
      :aria-label="t('modelPlaza.title')"
    >
      <!-- 左:品牌标识(与落地页顶栏一致);公开设置加载前展示骨架,避免先闪默认品牌 -->
      <RouterLink
        v-if="settings"
        to="/"
        class="flex min-w-0 items-center rounded-md"
        :aria-label="t('ui52.publicPages.nav.home')"
      >
        <BrandMark size="sm" show-domain />
      </RouterLink>
      <span v-else class="flex shrink-0 items-center gap-2" aria-hidden="true">
        <span class="h-6 w-6 animate-pulse rounded-md bg-gray-200 dark:bg-dark-800"></span>
        <span class="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-800"></span>
      </span>

      <div class="hidden shrink-0 items-center gap-1 text-sm sm:flex">
        <RouterLink to="/" class="plaza-nav-link">
          {{ t('ui52.publicPages.nav.home') }}
        </RouterLink>
        <span class="plaza-nav-link plaza-nav-link--active" aria-current="page">
          {{ t('modelPlaza.title') }}
        </span>
      </div>

      <!-- 右:语言 / 主题 / 登录或回到后台 -->
      <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        <LocaleSwitcher />

        <button
          type="button"
          class="plaza-icon-btn"
          :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          @click="toggleTheme"
        >
          <Icon v-if="isDark" name="sun" size="sm" />
          <Icon v-else name="moon" size="sm" />
        </button>

        <RouterLink
          v-if="isAuthenticated"
          :to="backTarget"
          class="btn btn-ink btn-sm ml-1"
        >
          {{ t('modelPlaza.nav.backToDashboard') }}
        </RouterLink>
        <RouterLink
          v-else
          :to="{ path: '/login', query: { redirect: '/model-plaza' } }"
          class="btn btn-ink btn-sm ml-1"
        >
          {{ t('modelPlaza.nav.login') }}
        </RouterLink>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
/**
 * 模型广场独立顶栏:与落地页 HomeHeader 同一视觉语言(纸面半透明 sticky + 1px 底线 + 墨色 CTA)。
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import BrandMark from '@/components/brand/BrandMark.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()

const settings = computed(() => appStore.cachedPublicSettings)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const backTarget = computed(() => (authStore.isAdmin ? '/admin/dashboard' : '/dashboard'))

// 主题切换:与落地页一致,写入 localStorage('theme') 并切换根节点 dark 类
const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}
</script>

<style scoped>
.plaza-nav-link {
  @apply rounded-md px-3 py-1.5 text-gray-600 transition-colors hover:bg-gray-200/50 hover:text-gray-950;
  @apply dark:text-dark-300 dark:hover:bg-dark-800 dark:hover:text-white;
}

.plaza-nav-link--active {
  @apply font-medium text-gray-950 dark:text-white;
}

.plaza-icon-btn {
  @apply flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors;
  @apply hover:bg-gray-200/60 hover:text-gray-950 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white;
}
</style>
