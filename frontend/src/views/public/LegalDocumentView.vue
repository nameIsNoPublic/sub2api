<template>
  <div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-950 dark:text-white">
    <header class="sticky top-0 z-40 border-b border-gray-200/80 bg-gray-50/80 backdrop-blur-md supports-[backdrop-filter]:bg-gray-50/70 dark:border-dark-800 dark:bg-dark-950/80 dark:supports-[backdrop-filter]:bg-dark-950/70">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <RouterLink to="/home" class="flex min-w-0 items-center rounded-md" :aria-label="t('ui52.publicPages.nav.home')">
          <BrandMark v-if="settings" size="sm" show-domain />
          <template v-else>
            <span class="h-6 w-6 flex-shrink-0 animate-pulse rounded-md bg-gray-200 dark:bg-dark-800" aria-hidden="true"></span>
            <span class="ml-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-dark-800" aria-hidden="true"></span>
          </template>
        </RouterLink>
        <RouterLink to="/login" class="btn btn-ink btn-sm shrink-0">
          {{ t('home.login') }}
        </RouterLink>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <div v-if="loading" class="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <div class="skeleton h-4 w-32"></div>
        <div class="skeleton h-9 w-2/3"></div>
        <div class="skeleton mt-8 h-4 w-full"></div>
        <div class="skeleton h-4 w-11/12"></div>
        <div class="skeleton h-4 w-4/5"></div>
      </div>

      <section
        v-else-if="loadError"
        class="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
      >
        <h1 class="text-lg font-semibold">{{ t('legal.loadFailed') }}</h1>
        <p class="mt-2 text-sm">{{ t('legal.retryLater') }}</p>
      </section>

      <section
        v-else-if="!currentDocument"
        class="mx-auto max-w-3xl rounded-xl border border-gray-200/80 bg-white p-6 dark:border-dark-800 dark:bg-dark-900/80"
      >
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200/80 dark:bg-dark-800 dark:text-dark-300 dark:ring-dark-700">
            <Icon name="document" size="sm" />
          </span>
          <div>
            <h1 class="text-lg font-semibold text-gray-950 dark:text-white">{{ t('legal.notFound') }}</h1>
            <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-dark-300">
              {{ t('legal.notFoundDescription') }}
            </p>
          </div>
        </div>
      </section>

      <div
        v-else
        class="mx-auto grid max-w-3xl gap-10"
        :class="{ 'lg:max-w-none lg:grid-cols-[minmax(0,1fr)_220px]': toc.length > 1 }"
      >
        <article class="min-w-0 lg:mx-0" :class="{ 'lg:max-w-3xl': toc.length > 1 }">
          <header class="mb-10 border-b border-gray-200/80 pb-8 dark:border-dark-800">
            <p class="kicker">
              <Icon :name="documentIcon" size="xs" class="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
              {{ documentTypeLabel }}
            </p>
            <h1 class="mt-4 break-words text-3xl font-semibold tracking-tightest text-gray-950 dark:text-white sm:text-4xl">
              {{ currentDocument.title }}
            </h1>
            <p v-if="updatedAt" class="mt-4 font-mono text-xs text-gray-500 dark:text-dark-400">
              {{ t('legal.updatedAt', { date: updatedAt }) }}
            </p>
          </header>

          <div
            v-if="hasContent"
            class="legal-document-content"
            v-html="renderedHtml"
          ></div>
          <div
            v-else
            class="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center text-sm text-gray-500 dark:border-dark-700 dark:bg-dark-900/60 dark:text-dark-400"
          >
            {{ t('legal.empty') }}
          </div>
        </article>

        <!-- 目录侧栏:仅大屏且标题数 > 1 时展示 -->
        <nav
          v-if="toc.length > 1"
          class="hidden lg:block"
          :aria-label="t('ui52.publicPages.legal.toc')"
        >
          <div class="sticky top-24">
            <p class="kicker mb-3">{{ t('ui52.publicPages.legal.toc') }}</p>
            <ul class="space-y-0.5 border-l border-gray-200 dark:border-dark-800">
              <li v-for="item in toc" :key="item.id">
                <a
                  :href="`#${item.id}`"
                  class="-ml-px block border-l border-transparent py-1 text-[13px] leading-5 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-950 dark:text-dark-400 dark:hover:border-dark-500 dark:hover:text-white"
                  :class="item.level === 3 ? 'pl-6' : 'pl-3'"
                  @click.prevent="scrollToHeading(item.id)"
                >{{ item.text }}</a>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { getLocale } from '@/i18n'
import BrandMark from '@/components/brand/BrandMark.vue'
import { useAppStore } from '@/stores/app'
import type { LoginAgreementDocument } from '@/types'
import { sanitizeLegalHtml, type LegalTocItem } from './legalDocumentHtml'
import zhAdminCompliance from '../../../../docs/legal/admin-compliance.zh.md?raw'
import enAdminCompliance from '../../../../docs/legal/admin-compliance.en.md?raw'

type LegalDocumentIcon = 'document' | 'shield' | 'globe' | 'cog'

const route = useRoute()
const { t } = useI18n()
const appStore = useAppStore()
const settings = computed(() => appStore.cachedPublicSettings)
const loading = ref(!settings.value)
const loadError = ref(false)

marked.setOptions({
  breaks: true,
  gfm: true,
})

const documentId = computed(() => String(route.params.documentId || ''))
const isAdminComplianceDocument = computed(() => documentId.value === 'admin-compliance')
const documents = computed(() => settings.value?.login_agreement_documents ?? [])
const updatedAt = computed(() =>
  isAdminComplianceDocument.value ? '' : settings.value?.login_agreement_updated_at || ''
)
const documentTypeLabel = computed(() =>
  isAdminComplianceDocument.value ? t('legal.adminCompliance') : t('legal.loginAgreement')
)

const currentDocument = computed<LoginAgreementDocument | null>(() => {
  if (isAdminComplianceDocument.value) {
    return {
      id: 'admin-compliance',
      title: t('adminCompliance.title'),
      content_md: getLocale() === 'zh' ? zhAdminCompliance : enAdminCompliance
    }
  }
  const id = documentId.value
  if (!id) {
    return null
  }
  return documents.value.find((doc) => doc.id === id) ?? null
})

const hasContent = computed(() => Boolean(currentDocument.value?.content_md?.trim()))

/** 渲染正文:marked 转 HTML 后统一交给 sanitizeLegalHtml 净化并生成目录锚点。 */
const renderedDocument = computed<{ html: string; toc: LegalTocItem[] }>(() => {
  const content = currentDocument.value?.content_md?.trim() || ''
  if (!content) {
    return { html: '', toc: [] }
  }
  return sanitizeLegalHtml(marked.parse(content) as string)
})

const renderedHtml = computed(() => renderedDocument.value.html)
const toc = computed(() => renderedDocument.value.toc)

function scrollToHeading(id: string): void {
  const target = document.getElementById(id)
  if (!target) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
}

const documentIcon = computed<LegalDocumentIcon>(() => {
  const title = currentDocument.value?.title || ''
  if (title.includes('政策') || title.includes('隐私')) {
    return 'shield'
  }
  if (title.includes('国家') || title.includes('地区')) {
    return 'globe'
  }
  if (title.includes('特定')) {
    return 'cog'
  }
  return 'document'
})

onMounted(async () => {
  loadError.value = false
  const loadedSettings = await appStore.fetchPublicSettings()
  if (!loadedSettings) {
    loadError.value = true
  }
  loading.value = false
})
</script>

<style scoped>
/* 阅读排版:正文 16px / 行高 1.8,标题紧字距,锚点跳转避开 sticky 顶栏 */
.legal-document-content {
  font-size: 16px;
  line-height: 1.8;
  overflow-wrap: anywhere;
  color: inherit;
}

.legal-document-content :deep(h1),
.legal-document-content :deep(h2),
.legal-document-content :deep(h3),
.legal-document-content :deep(h4) {
  scroll-margin-top: 6rem;
  @apply tracking-tight text-gray-950 dark:text-white;
}

.legal-document-content :deep(h1) {
  @apply mb-4 mt-10 border-b border-gray-200/80 pb-3 text-2xl font-semibold first:mt-0 dark:border-dark-800;
}

.legal-document-content :deep(h2) {
  @apply mb-3 mt-10 text-xl font-semibold first:mt-0;
}

.legal-document-content :deep(h3) {
  @apply mb-2 mt-7 text-lg font-semibold;
}

.legal-document-content :deep(h4) {
  @apply mb-2 mt-6 text-base font-semibold;
}

.legal-document-content :deep(p) {
  @apply mb-5 text-gray-700 dark:text-dark-200;
}

.legal-document-content :deep(strong) {
  @apply font-semibold text-gray-950 dark:text-white;
}

.legal-document-content :deep(a) {
  @apply text-primary-600 underline decoration-primary-300 underline-offset-4 hover:text-primary-700 hover:decoration-primary-500 dark:text-primary-300 dark:decoration-primary-500/50 dark:hover:text-primary-200;
}

.legal-document-content :deep(ul) {
  @apply mb-5 list-disc pl-6 marker:text-gray-400 dark:marker:text-dark-500;
}

.legal-document-content :deep(ol) {
  @apply mb-5 list-decimal pl-6 marker:font-mono marker:text-sm marker:text-gray-400 dark:marker:text-dark-500;
}

.legal-document-content :deep(li) {
  @apply mb-1.5 text-gray-700 dark:text-dark-200;
}

.legal-document-content :deep(blockquote) {
  @apply my-6 rounded-r-lg border-l-2 border-primary-400 bg-primary-50/50 py-2 pl-4 pr-3 text-gray-600 dark:border-primary-500/60 dark:bg-primary-500/5 dark:text-dark-300;
}

.legal-document-content :deep(blockquote p:last-child) {
  @apply mb-0;
}

.legal-document-content :deep(code) {
  @apply rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800 ring-1 ring-inset ring-gray-200/80 dark:bg-dark-800 dark:text-gray-200 dark:ring-dark-700;
}

.legal-document-content :deep(pre) {
  @apply my-6 overflow-x-auto rounded-xl bg-[#0c0d10] p-4 text-[13px] text-gray-100 ring-1 ring-white/5;
}

.legal-document-content :deep(pre code) {
  @apply bg-transparent p-0 text-inherit ring-0;
}

.legal-document-content :deep(table) {
  @apply my-6 block w-full overflow-x-auto border-collapse text-sm;
}

.legal-document-content :deep(th) {
  @apply border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold dark:border-dark-700 dark:bg-dark-900;
}

.legal-document-content :deep(td) {
  @apply border border-gray-200 px-3 py-2 dark:border-dark-700;
}

.legal-document-content :deep(img) {
  @apply my-6 h-auto max-w-full rounded-xl;
}

.legal-document-content :deep(hr) {
  @apply my-10 border-gray-200 dark:border-dark-800;
}
</style>
