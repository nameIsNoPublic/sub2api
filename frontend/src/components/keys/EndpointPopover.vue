<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useClipboard } from '@/composables/useClipboard'
import type { CustomEndpoint } from '@/types'

const props = defineProps<{
  apiBaseUrl: string
  customEndpoints: CustomEndpoint[]
}>()

const { t } = useI18n()
const { copyToClipboard } = useClipboard()
const copiedEndpoint = ref<string | null>(null)

let copiedResetTimer: number | undefined

const allEndpoints = computed(() => {
  const items: Array<{ name: string; endpoint: string; description: string; isDefault: boolean }> = []
  if (props.apiBaseUrl) {
    items.push({
      name: t('keys.endpoints.title'),
      endpoint: props.apiBaseUrl,
      description: '',
      isDefault: true,
    })
  }
  for (const ep of props.customEndpoints) {
    items.push({ ...ep, isDefault: false })
  }
  return items
})

async function copy(url: string) {
  const success = await copyToClipboard(url, t('keys.endpoints.copied'))
  if (!success) return

  copiedEndpoint.value = url
  if (copiedResetTimer !== undefined) {
    window.clearTimeout(copiedResetTimer)
  }
  copiedResetTimer = window.setTimeout(() => {
    if (copiedEndpoint.value === url) {
      copiedEndpoint.value = null
    }
  }, 1800)
}

function tooltipHint(endpoint: string): string {
  return copiedEndpoint.value === endpoint
    ? t('keys.endpoints.copiedHint')
    : t('keys.endpoints.clickToCopy')
}

/** 拆分地址用于展示：域名部分常规色，路径部分用 ember 高亮（仅视觉，不影响复制内容）。 */
function splitEndpoint(endpoint: string): { origin: string; path: string } {
  const match = endpoint.match(/^([a-z][a-z0-9+.-]*:\/\/[^/]+)(.*)$/i)
  return match ? { origin: match[1], path: match[2] } : { origin: endpoint, path: '' }
}

function speedTestUrl(endpoint: string): string {
  return `https://www.tcptest.cn/http/${encodeURIComponent(endpoint)}`
}

onBeforeUnmount(() => {
  if (copiedResetTimer !== undefined) {
    window.clearTimeout(copiedResetTimer)
  }
})
</script>

<template>
  <div v-if="allEndpoints.length > 0" class="flex flex-wrap gap-2">
    <div
      v-for="(item, index) in allEndpoints"
      :key="index"
      class="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-gray-200/80 bg-white py-1.5 pl-2.5 pr-1.5 text-xs shadow-[0_1px_0_rgba(23,24,28,0.03)] transition-colors hover:border-gray-300 dark:border-dark-800 dark:bg-dark-900 dark:hover:border-dark-700"
    >
      <span class="flex shrink-0 items-center gap-1.5">
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="item.isDefault ? 'bg-ember-500' : 'bg-gray-300 dark:bg-dark-600'"
          aria-hidden="true"
        ></span>
        <span class="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-gray-500 dark:text-dark-400">{{ item.name }}</span>
      </span>
      <span
        v-if="item.isDefault"
        class="shrink-0 rounded bg-primary-50 px-1 py-px text-[10px] font-medium leading-tight text-primary-700 ring-1 ring-inset ring-primary-200/70 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/25"
      >{{ t('keys.endpoints.default') }}</span>

      <span class="h-3.5 w-px shrink-0 bg-gray-200 dark:bg-dark-700" aria-hidden="true"></span>

      <div class="group/endpoint relative flex min-w-0 items-center gap-1">
        <div
          class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[24rem] -translate-x-1/2 translate-y-1 rounded-lg border border-gray-800 bg-gray-950 px-3 py-2.5 text-left opacity-0 shadow-pop transition-all duration-150 group-hover/endpoint:translate-y-0 group-hover/endpoint:opacity-100 group-focus-within/endpoint:translate-y-0 group-focus-within/endpoint:opacity-100 dark:border-dark-700 dark:bg-dark-800"
        >
          <p
            v-if="item.description"
            class="max-w-[24rem] break-words text-xs leading-5 text-gray-200"
          >
            {{ item.description }}
          </p>
          <p
            class="break-all font-mono text-[11px] leading-4 text-gray-100"
            :class="item.description ? 'mt-1.5' : ''"
          >{{ item.endpoint }}</p>
          <p class="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] leading-4 text-gray-400">
            <span class="h-1.5 w-1.5 rounded-full bg-ember-400"></span>
            {{ tooltipHint(item.endpoint) }}
          </p>
          <div class="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-gray-800 bg-gray-950 dark:border-dark-700 dark:bg-dark-800"></div>
        </div>

        <code
          class="min-w-0 cursor-pointer break-all rounded px-1 py-0.5 font-mono text-[12px] text-gray-800 transition-colors hover:bg-gray-100 focus:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 sm:truncate sm:break-normal dark:text-dark-100 dark:hover:bg-dark-800 dark:focus:bg-dark-800 dark:focus-visible:ring-primary-400/60"
          role="button"
          tabindex="0"
          @click="copy(item.endpoint)"
          @keydown.enter.prevent="copy(item.endpoint)"
          @keydown.space.prevent="copy(item.endpoint)"
        ><span>{{ splitEndpoint(item.endpoint).origin }}</span><span class="text-ember-600 dark:text-ember-400">{{ splitEndpoint(item.endpoint).path }}</span></code>

        <button
          type="button"
          class="shrink-0 rounded-md p-1 transition-colors"
          :class="copiedEndpoint === item.endpoint
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-800 dark:text-dark-500 dark:hover:bg-dark-800 dark:hover:text-white'"
          :aria-label="tooltipHint(item.endpoint)"
          @click="copy(item.endpoint)"
        >
          <svg v-if="copiedEndpoint === item.endpoint" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <svg v-else class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        <a
          :href="speedTestUrl(item.endpoint)"
          target="_blank"
          rel="noopener noreferrer"
          class="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-ember-50 hover:text-ember-600 dark:text-dark-500 dark:hover:bg-ember-500/10 dark:hover:text-ember-400"
          :title="t('keys.endpoints.speedTest')"
        >
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>
