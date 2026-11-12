<template>
  <!-- 用量汇总：四张等宽指标卡，首卡染色（视觉母版：仪表盘余额卡），图标走彩色底块 -->
  <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
    <div class="card-tinted min-w-0 p-4 sm:p-5">
      <div class="flex items-center gap-2.5">
        <span class="stat-icon stat-icon-primary h-8 w-8" aria-hidden="true">
          <Icon name="document" size="sm" />
        </span>
        <p class="kicker">{{ t('usage.totalRequests') }}</p>
      </div>
      <p class="mt-3 truncate text-[1.7rem] font-semibold leading-9 tracking-tight tabular-nums text-gray-950 dark:text-white">
        {{ stats?.total_requests?.toLocaleString() || '0' }}
      </p>
      <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ t('usage.inSelectedRange') }}</p>
    </div>
    <div class="card min-w-0 p-4 sm:p-5">
      <div class="flex items-center gap-2.5">
        <span class="stat-icon stat-icon-ember h-8 w-8" aria-hidden="true">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
        </span>
        <p class="kicker">{{ t('usage.totalTokens') }}</p>
      </div>
      <p class="mt-3 truncate text-[1.7rem] font-semibold leading-9 tracking-tight tabular-nums text-gray-950 dark:text-white">
        {{ formatTokens(stats?.total_tokens || 0) }}
      </p>
      <div
        v-if="(stats?.total_tokens || 0) > 0"
        class="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-800"
        aria-hidden="true"
      >
        <div class="bg-primary-500 dark:bg-primary-400" :style="{ width: tokenPct.input }"></div>
        <div class="bg-primary-300 dark:bg-primary-500/40" :style="{ width: tokenPct.output }"></div>
        <div class="bg-ember-500 dark:bg-ember-400" :style="{ width: tokenPct.cache }"></div>
      </div>
      <p class="mt-1 flex flex-wrap items-center gap-x-1 text-xs tabular-nums text-gray-500 dark:text-dark-400">
        <span>{{ t('usage.in') }}: {{ formatTokens(stats?.total_input_tokens || 0) }}</span>
        <span class="text-gray-300 dark:text-dark-600">/</span>
        <span>{{ t('usage.out') }}: {{ formatTokens(stats?.total_output_tokens || 0) }}</span>
        <span class="text-gray-300 dark:text-dark-600">/</span>
        <span class="group relative inline-flex cursor-help items-center gap-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40" tabindex="0">
          <span>{{ cacheLabel() }}: {{ formatTokens(stats?.total_cache_tokens || 0) }}</span>
          <svg
            class="h-3.5 w-3.5 text-gray-400 dark:text-dark-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span
            class="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-56 -translate-x-1/2 rounded-lg border border-gray-200/80 bg-white p-3 text-left text-xs text-gray-700 shadow-pop group-hover:block group-focus:block dark:border-dark-700 dark:bg-dark-900 dark:text-dark-200"
          >
            <span class="mb-2 block font-medium text-gray-950 dark:text-white">
              {{ cacheDetailLabel() }}
            </span>
            <span class="flex items-center justify-between gap-3">
              <span>{{ t('usage.cacheCreationTokensLabel') }}</span>
              <span class="font-mono tabular-nums">
                {{ formatTokens(stats?.total_cache_creation_tokens || 0) }}
              </span>
            </span>
            <span class="mt-1 flex items-center justify-between gap-3">
              <span>{{ t('usage.cacheReadTokensLabel') }}</span>
              <span class="font-mono tabular-nums">
                {{ formatTokens(stats?.total_cache_read_tokens || 0) }}
              </span>
            </span>
          </span>
        </span>
      </p>
    </div>
    <div class="card min-w-0 p-4 sm:p-5">
      <div class="flex items-center gap-2.5">
        <span class="stat-icon stat-icon-success h-8 w-8" aria-hidden="true">
          <Icon name="dollar" size="sm" />
        </span>
        <p class="kicker">{{ t('usage.totalCost') }}</p>
      </div>
      <p class="mt-3 truncate text-[1.7rem] font-semibold leading-9 tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
        ${{ (stats?.total_actual_cost || 0).toFixed(4) }}
      </p>
      <p class="mt-1 text-xs tabular-nums text-gray-400 dark:text-dark-500">
        <template v-if="showAccountCost && totalAccountCost != null">
          <span class="text-ember-600 dark:text-ember-400">{{ t('usage.accountCost') }} ${{ totalAccountCost.toFixed(4) }}</span>
          <span> · </span>
        </template>
        <span>
          {{ t('usage.standardCost') }}
          <span :class="{ 'line-through': strikeStandardCost }">${{ (stats?.total_cost || 0).toFixed(4) }}</span>
        </span>
      </p>
    </div>
    <div class="card min-w-0 p-4 sm:p-5">
      <div class="flex items-center gap-2.5">
        <span class="stat-icon stat-icon-info h-8 w-8" aria-hidden="true">
          <Icon name="clock" size="sm" />
        </span>
        <p class="kicker">{{ t('usage.avgDuration') }}</p>
      </div>
      <p class="mt-3 truncate text-[1.7rem] font-semibold leading-9 tracking-tight tabular-nums text-gray-950 dark:text-white">
        {{ formatDuration(stats?.average_duration_ms || 0) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AdminUsageStatsResponse } from '@/api/admin/usage'
import type { UsageStatsResponse } from '@/types'
import Icon from '@/components/icons/Icon.vue'

const props = withDefaults(defineProps<{
  stats: (AdminUsageStatsResponse | UsageStatsResponse) | null
  showAccountCost?: boolean
  strikeStandardCost?: boolean
}>(), {
  showAccountCost: true,
  strikeStandardCost: false,
})

const { t } = useI18n()

const totalAccountCost = computed(() => {
  const stats = props.stats as (AdminUsageStatsResponse & { total_account_cost?: number }) | null
  return stats?.total_account_cost ?? null
})
const showAccountCost = computed(() => props.showAccountCost)
const strikeStandardCost = computed(() => props.strikeStandardCost)

// Token 构成条：输入/输出/缓存占比（仅展示，总和为 0 时构成条整体隐藏）
const tokenPct = computed(() => {
  const input = props.stats?.total_input_tokens || 0
  const output = props.stats?.total_output_tokens || 0
  const cache = props.stats?.total_cache_tokens || 0
  const sum = input + output + cache
  if (sum <= 0) return { input: '0%', output: '0%', cache: '0%' }
  const pct = (n: number) => `${((n / sum) * 100).toFixed(1)}%`
  return { input: pct(input), output: pct(output), cache: pct(cache) }
})

const formatDuration = (ms: number) =>
  ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`

const formatTokens = (value: number) => {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M'
  if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K'
  return value.toLocaleString()
}

const cacheLabel = () => t('usage.cacheTotal')
const cacheDetailLabel = () => t('usage.cacheBreakdown')
</script>
