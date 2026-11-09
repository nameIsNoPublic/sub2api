<template>
  <section class="card flex h-full flex-col overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-dark-800">
      <div class="flex min-w-0 items-center gap-2.5">
        <h2 class="text-sm font-semibold tracking-tight text-gray-950 dark:text-white">{{ t('dashboard.recentUsage') }}</h2>
        <span class="badge badge-gray font-mono text-[10.5px]">{{ t('dashboard.last7Days') }}</span>
      </div>
      <router-link
        v-if="!loading && data.length > 0"
        to="/usage"
        class="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
      >
        {{ t('dashboard.viewAllUsage') }}
        <Icon name="arrowRight" size="xs" class="transition-transform group-hover:translate-x-0.5" />
      </router-link>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center py-12">
      <LoadingSpinner size="lg" />
    </div>
    <div v-else-if="data.length === 0" class="flex-1 py-8">
      <EmptyState :title="t('dashboard.noUsageRecords')" :description="t('dashboard.startUsingApi')" />
    </div>
    <div v-else class="flex-1 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 dark:border-dark-800">
            <th class="px-5 py-2.5 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-dark-400">
              {{ t('ui52.dashboard.colTime') }}
            </th>
            <th class="px-3 py-2.5 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-dark-400">
              {{ t('dashboard.model') }}
            </th>
            <th class="hidden px-3 py-2.5 text-right font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-dark-400 sm:table-cell">
              {{ t('dashboard.tokens') }}
            </th>
            <th
              class="px-5 py-2.5 text-right font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-dark-400"
              :title="`${t('dashboard.actual')} / ${t('dashboard.standard')}`"
            >
              {{ t('ui52.dashboard.colCost') }}
            </th>
          </tr>
        </thead>
        <tbody class="font-mono tabular-nums">
          <tr
            v-for="log in data"
            :key="log.id"
            class="border-b border-gray-100 transition-colors last:border-b-0 hover:bg-gray-50/70 dark:border-dark-800/70 dark:hover:bg-dark-800/40"
          >
            <td class="whitespace-nowrap px-5 py-3 text-[13px] text-gray-500 dark:text-dark-400">
              {{ formatDateTime(log.created_at) }}
            </td>
            <td class="max-w-[220px] truncate px-3 py-3 text-[13px] font-medium text-gray-950 dark:text-white" :title="log.model">
              {{ log.model }}
            </td>
            <td
              class="hidden whitespace-nowrap px-3 py-3 text-right text-[13px] text-gray-700 dark:text-gray-300 sm:table-cell"
              :title="`${formatNumber(tokenCount(log))} tokens`"
            >
              {{ formatTokens(tokenCount(log)) }}
            </td>
            <td class="whitespace-nowrap px-5 py-3 text-right text-[13px]">
              <span class="font-medium text-gray-950 dark:text-white" :title="t('dashboard.actual')">${{ formatCost(log.actual_cost) }}</span>
              <span class="text-gray-500 dark:text-dark-400" :title="t('dashboard.standard')"> / ${{ formatCost(log.total_cost) }}</span>
              <!-- 小屏隐藏 Token 列，改在费用下方显示 -->
              <span
                class="mt-0.5 block text-[11px] text-gray-500 dark:text-dark-400 sm:hidden"
                :title="`${formatNumber(tokenCount(log))} tokens`"
              >
                {{ formatTokens(tokenCount(log)) }} {{ t('dashboard.tokens') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Icon from '@/components/icons/Icon.vue'
import { formatDateTime, formatNumberLocaleString as formatNumber, formatTokensK as formatTokens } from '@/utils/format'
import type { UsageLog } from '@/types'

defineProps<{
  data: UsageLog[]
  loading: boolean
}>()
const { t } = useI18n()
const formatCost = (c: number) => c.toFixed(4)
/** 与原版一致：只统计输入 + 输出 Token */
const tokenCount = (log: UsageLog) => log.input_tokens + log.output_tokens
</script>
