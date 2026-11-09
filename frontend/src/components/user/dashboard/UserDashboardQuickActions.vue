<template>
  <section class="card flex h-full flex-col overflow-hidden">
    <div class="border-b border-gray-100 px-5 py-3.5 dark:border-dark-800">
      <h2 class="text-sm font-semibold tracking-tight text-gray-950 dark:text-white">{{ t('dashboard.quickActions') }}</h2>
    </div>

    <!-- 接入地址：主地址为站点根地址；不同客户端的 Base URL 写法不同，逐行可复制 -->
    <div class="border-b border-gray-100 px-5 py-4 dark:border-dark-800">
      <p class="kicker">{{ t('ui52.dashboard.endpoint') }}</p>
      <div
        class="mt-2.5 flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50/80 py-1.5 pl-3 pr-1.5 dark:border-dark-700 dark:bg-dark-950/60"
      >
        <span class="signal-dot" aria-hidden="true"></span>
        <code class="min-w-0 flex-1 truncate font-mono text-[13px] font-medium text-gray-950 dark:text-white" :title="endpointRoot">
          {{ endpointRoot }}
        </code>
        <button
          type="button"
          class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-gray-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
          :title="t('ui52.dashboard.copyEndpoint')"
          :aria-label="t('ui52.dashboard.copyEndpoint')"
          @click="copyUrl('root', endpointRoot)"
        >
          <Icon v-if="isCopied('root')" name="check" size="sm" class="text-emerald-600 dark:text-emerald-400" />
          <Icon v-else name="copy" size="sm" />
        </button>
      </div>
      <p class="mt-2.5 text-xs text-gray-500 dark:text-dark-400">{{ t('ui52.dashboard.endpointHint') }}</p>
      <ul class="mt-1.5 space-y-0.5">
        <li v-for="client in clientEndpoints" :key="client.key">
          <button
            type="button"
            class="group/client flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:bg-dark-800/50"
            :title="client.url"
            :aria-label="t('ui52.dashboard.copyClientUrl', { client: client.label })"
            @click="copyUrl(client.key, client.url)"
          >
            <span class="min-w-0 flex-1 truncate text-gray-600 dark:text-gray-300">{{ client.label }}</span>
            <span
              class="shrink-0 font-mono"
              :class="client.path ? 'text-ember-600 dark:text-ember-400' : 'text-gray-400 dark:text-dark-500'"
            >
              {{ client.path || t('ui52.dashboard.rootOnly') }}
            </span>
            <Icon v-if="isCopied(client.key)" name="check" size="xs" class="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <Icon v-else name="copy" size="xs" class="shrink-0 text-gray-300 transition-colors group-hover/client:text-gray-500 dark:text-dark-600 dark:group-hover/client:text-dark-300" />
          </button>
        </li>
      </ul>
    </div>

    <div class="flex-1 divide-y divide-gray-100 dark:divide-dark-800">
      <button type="button" class="quick-action group" @click="router.push('/keys')">
        <span class="quick-action__icon">
          <Icon name="key" size="sm" :stroke-width="1.75" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-gray-950 dark:text-white">{{ t('dashboard.createApiKey') }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.generateNewKey') }}</span>
        </span>
        <Icon name="chevronRight" size="sm" class="quick-action__chevron" />
      </button>

      <button type="button" class="quick-action group" @click="router.push('/usage')">
        <span class="quick-action__icon">
          <Icon name="chartBar" size="sm" :stroke-width="1.75" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-gray-950 dark:text-white">{{ t('dashboard.viewUsage') }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.checkDetailedLogs') }}</span>
        </span>
        <Icon name="chevronRight" size="sm" class="quick-action__chevron" />
      </button>

      <button v-if="canUseBatchImage" type="button" class="quick-action group" @click="router.push('/batch-image')">
        <span class="quick-action__icon">
          <Icon name="sparkles" size="sm" :stroke-width="1.75" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-gray-950 dark:text-white">{{ t('dashboard.batchImageAgent') }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.batchImageAgentDesc') }}</span>
        </span>
        <Icon name="chevronRight" size="sm" class="quick-action__chevron" />
      </button>

      <button type="button" class="quick-action group" @click="router.push('/redeem')">
        <span class="quick-action__icon">
          <Icon name="gift" size="sm" :stroke-width="1.75" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-gray-950 dark:text-white">{{ t('dashboard.redeemCode') }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-dark-400">{{ t('dashboard.addBalanceWithCode') }}</span>
        </span>
        <Icon name="chevronRight" size="sm" class="quick-action__chevron" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { useBatchImageAccess } from '@/composables/useBatchImageAccess'
import { useBrand } from '@/composables/useBrand'
import { useClipboard } from '@/composables/useClipboard'

const router = useRouter()
const { t } = useI18n()
const { canUseBatchImage, refreshBatchImageAccess } = useBatchImageAccess()
const { apiBaseUrl } = useBrand()
const { copied, copyToClipboard } = useClipboard()

/** 站点根地址：去掉后台可能配置的 /v1、/v1beta 后缀与末尾斜杠 */
const endpointRoot = computed(() =>
  apiBaseUrl.value.replace(/\/+$/, '').replace(/\/v1(beta)?$/, '').replace(/\/+$/, '')
)

/**
 * 各类客户端的 Base URL 写法（与 UseKeyModal 的生成逻辑一致）：
 * OpenAI 兼容客户端与 Codex 需要 /v1；Claude Code、Gemini CLI 会自行拼接版本路径，只填根地址；
 * 直连 Gemini API（如 OpenCode 的 gemini provider）使用 /v1beta。
 */
const clientEndpoints = computed(() => [
  { key: 'openai', label: t('ui52.dashboard.clientOpenAI'), path: '/v1', url: `${endpointRoot.value}/v1` },
  { key: 'claude', label: t('ui52.dashboard.clientClaude'), path: '', url: endpointRoot.value },
  { key: 'gemini', label: t('ui52.dashboard.clientGemini'), path: '/v1beta', url: `${endpointRoot.value}/v1beta` }
])

/** 最近一次复制的条目，用于在对应行显示对勾 */
const lastCopiedKey = ref('')

function copyUrl(key: string, url: string) {
  lastCopiedKey.value = key
  void copyToClipboard(url)
}

function isCopied(key: string): boolean {
  return copied.value && lastCopiedKey.value === key
}

onMounted(() => {
  void refreshBatchImageAccess()
})
</script>

<style scoped>
.quick-action {
  @apply flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors;
  @apply hover:bg-gray-50/80 dark:hover:bg-dark-800/40;
  @apply focus:outline-none focus-visible:bg-gray-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40 dark:focus-visible:bg-dark-800/60;
}

.quick-action__icon {
  @apply flex h-8 w-8 shrink-0 items-center justify-center rounded-lg;
  @apply border border-gray-200 bg-white text-gray-600 transition-colors;
  @apply dark:border-dark-700 dark:bg-dark-900 dark:text-dark-300;
}

.group:hover .quick-action__icon {
  @apply border-primary-200 text-primary-600 dark:border-primary-500/30 dark:text-primary-400;
}

.quick-action__chevron {
  @apply shrink-0 text-gray-300 transition-transform dark:text-dark-600;
}

.group:hover .quick-action__chevron {
  @apply translate-x-0.5 text-gray-500 dark:text-dark-400;
}
</style>
