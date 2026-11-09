<template>
  <footer class="bg-gray-50 dark:bg-dark-950">
    <div
      class="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <BrandMark size="sm" show-domain />
        <span class="min-w-0 truncate text-xs text-gray-500 dark:text-dark-400">{{ siteSubtitle }}</span>
      </div>

      <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-dark-400" :aria-label="t('ui52.home.footer.label')">
        <router-link v-if="showModelPlazaEntry" to="/model-plaza" class="footer-link">{{ t('nav.modelPlaza') }}</router-link>
        <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="footer-link">
          {{ isAuthenticated ? t('ui52.home.footer.console') : t('ui52.home.footer.login') }}
        </router-link>
        <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="footer-link">{{ t('home.docs') }}</a>
      </nav>
    </div>

    <div class="border-t border-gray-200/80 dark:border-dark-800">
      <div
        class="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-5 font-mono text-[11px] text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:text-dark-400"
      >
        <p class="[overflow-wrap:anywhere]">&copy; {{ currentYear }} {{ copyrightHolder }}. {{ t('ui52.home.footer.rights') }}</p>
        <a :href="githubUrl" target="_blank" rel="noopener noreferrer" class="footer-link">
          {{ t('ui52.home.footer.poweredBy') }}
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
/** 落地页页脚：品牌 + 副标题、站内链接、版权与上游开源署名。 */
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/brand/BrandMark.vue'

defineProps<{
  isAuthenticated: boolean
  dashboardPath: string
  showModelPlazaEntry: boolean
  docUrl: string
  siteSubtitle: string
  /** 版权署名：默认品牌显示域名，自定义品牌显示站点名 */
  copyrightHolder: string
  currentYear: number
  githubUrl: string
}>()

const { t } = useI18n()
</script>

<style scoped>
.footer-link {
  @apply transition-colors hover:text-gray-950 dark:hover:text-white;
}
</style>
