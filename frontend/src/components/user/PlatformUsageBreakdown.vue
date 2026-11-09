<template>
  <div class="group/usage relative text-[13px] leading-5">
    <div class="flex items-center gap-1.5">
      <span class="text-gray-500 dark:text-dark-400">{{ t('admin.users.today') }}</span>
      <span class="font-mono font-medium tabular-nums text-gray-950 dark:text-white">${{ today.toFixed(4) }}</span>
      <Icon
        v-if="hasBreakdown"
        name="infoCircle"
        size="xs"
        class="text-gray-400 transition-colors group-hover/usage:text-primary-500 dark:text-dark-500"
      />
    </div>
    <div class="flex items-center gap-1.5">
      <span class="text-gray-500 dark:text-dark-400">{{ t('admin.users.total') }}</span>
      <span class="font-mono tabular-nums text-gray-600 dark:text-gray-300">${{ total.toFixed(4) }}</span>
    </div>

    <div
      v-if="hasBreakdown"
      class="pointer-events-none absolute left-full top-0 z-50 ml-2 min-w-[240px] whitespace-nowrap rounded-lg border border-gray-950 bg-gray-950 px-3 py-2.5 text-xs text-gray-100 opacity-0 shadow-pop transition-opacity duration-100 group-hover/usage:opacity-100 dark:border-dark-700 dark:bg-dark-800"
    >
      <div class="mb-1.5 flex items-center justify-between gap-3 border-b border-white/10 pb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">
        <span>{{ t('admin.users.platformBreakdown') }}</span>
        <span>{{ t('admin.users.today') }} / {{ t('admin.users.total') }}</span>
      </div>
      <div
        v-for="item in sortedBreakdown"
        :key="item.platform"
        class="flex items-center justify-between gap-4 py-0.5"
        :class="{ 'italic text-gray-400': item.isOther }"
      >
        <span class="capitalize">
          {{ item.isOther ? t('admin.users.platformOther') : platformLabel(item.platform) }}
        </span>
        <span class="font-mono tabular-nums">
          ${{ item.today_actual_cost.toFixed(4) }}
          <span class="text-gray-500">/</span>
          ${{ item.total_actual_cost.toFixed(4) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { PlatformUsage } from '@/api/admin/dashboard'

const props = defineProps<{
  today: number
  total: number
  byPlatform?: PlatformUsage[]
}>()

const { t } = useI18n()

// 与 UserDashboardStats 保持一致：把"总值 - 各平台之和"的差作为"其他"行展示，
// 避免 tooltip 内各平台费用加总与列首总值对不上。
const OTHER_THRESHOLD = 0.0001

interface BreakdownRow {
  platform: string
  today_actual_cost: number
  total_actual_cost: number
  isOther?: boolean
}

const sortedBreakdown = computed<BreakdownRow[]>(() => {
  const list = props.byPlatform ?? []
  const rows: BreakdownRow[] = [...list]
    .sort((a, b) => b.total_actual_cost - a.total_actual_cost)
    .map((p) => ({ ...p }))

  const sumTotal = rows.reduce((s, r) => s + r.total_actual_cost, 0)
  const sumToday = rows.reduce((s, r) => s + r.today_actual_cost, 0)
  const diffTotal = Math.max(0, props.total - sumTotal)
  const diffToday = Math.max(0, props.today - sumToday)
  if (diffTotal > OTHER_THRESHOLD || diffToday > OTHER_THRESHOLD) {
    rows.push({
      platform: '__other__',
      today_actual_cost: diffToday,
      total_actual_cost: diffTotal,
      isOther: true
    })
  }
  return rows
})

const hasBreakdown = computed(() => sortedBreakdown.value.length > 0)

const PLATFORM_LABELS: Record<string, string> = {
  anthropic: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
  antigravity: 'Antigravity',
  grok: 'Grok',
  kimi: 'Kimi',
  zhipu: 'Zhipu GLM',
  deepseek: 'DeepSeek',
  minimax: 'MiniMax',
}

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform
}
</script>
