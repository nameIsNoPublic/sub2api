<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Chart as ChartJS, ArcElement, Legend, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import type { OpsErrorDistributionResponse } from '@/api/admin/ops'
import type { ChartState } from '../types'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { DOUGHNUT_CUTOUT } from '@/components/charts/chartStyles'
import { useOpsChartTheme } from '../utils/useOpsChartTheme'

ChartJS.register(ArcElement, Tooltip, Legend)

interface Props {
  data: OpsErrorDistributionResponse | null
  loading: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'openDetails'): void
}>()
const { t } = useI18n()

const { isDark, semantic, tooltip, surface } = useOpsChartTheme()
// 错误分类配色（状态语义，不借用 Token 构成色）：上游=警告橙，客户端=信息 sky，系统=危险红，其他=中性灰
const colors = computed(() => ({
  upstream: semantic.value.warning,
  client: isDark.value ? '#38bdf8' : '#0ea5e9',
  system: semantic.value.danger,
  other: semantic.value.neutral
}))

const totalSlaErrors = computed(() =>
  (props.data?.items ?? []).reduce((total, item) => total + Number(item.sla || 0), 0)
)

const hasData = computed(() => totalSlaErrors.value > 0)

const state = computed<ChartState>(() => {
  if (hasData.value) return 'ready'
  if (props.loading) return 'loading'
  return 'empty'
})

interface ErrorCategory {
  label: string
  count: number
  color: string
}

const categories = computed<ErrorCategory[]>(() => {
  if (!props.data) return []

  let upstream = 0 // 502, 503, 504
  let client = 0 // 4xx
  let system = 0 // 500
  let other = 0

  for (const item of props.data.items || []) {
    const code = Number(item.status_code || 0)
    const count = Number(item.sla || 0)
    if (!Number.isFinite(code) || !Number.isFinite(count)) continue

    if ([502, 503, 504].includes(code)) upstream += count
    else if (code >= 400 && code < 500) client += count
    else if (code === 500) system += count
    else other += count
  }

  const out: ErrorCategory[] = []
  if (upstream > 0) out.push({ label: t('admin.ops.upstream'), count: upstream, color: colors.value.upstream })
  if (client > 0) out.push({ label: t('admin.ops.client'), count: client, color: colors.value.client })
  if (system > 0) out.push({ label: t('admin.ops.system'), count: system, color: colors.value.system })
  if (other > 0) out.push({ label: t('admin.ops.other'), count: other, color: colors.value.other })
  return out
})

const topReason = computed(() => {
  if (categories.value.length === 0) return null
  return categories.value.reduce((prev, cur) => (cur.count > prev.count ? cur : prev))
})

const chartData = computed(() => {
  if (!hasData.value || categories.value.length === 0) return null
  return {
    labels: categories.value.map((c) => c.label),
    datasets: [
      {
        data: categories.value.map((c) => c.count),
        backgroundColor: categories.value.map((c) => c.color),
        // 扇区之间用卡片底色描边分隔
        borderColor: surface.value,
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: tooltip.value
  }
}))
</script>

<template>
  <div class="card flex h-full flex-col p-5">
    <div class="mb-4 flex items-center justify-between gap-2">
      <h3 class="section-title flex items-center gap-2 text-sm">
        <svg class="h-4 w-4 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        {{ t('admin.ops.errorDistribution') }}
        <HelpTooltip :content="t('admin.ops.tooltips.errorDistribution')" />
      </h3>
      <button
        type="button"
        class="btn btn-secondary btn-sm shrink-0 px-2.5 py-1 text-[11px]"
        :disabled="state !== 'ready'"
        :title="t('admin.ops.errorTrend')"
        @click="emit('openDetails')"
      >
        {{ t('admin.ops.requestDetails.details') }}
      </button>
    </div>

    <div class="relative min-h-0 flex-1">
      <div v-if="state === 'ready' && chartData" class="flex h-full flex-col">
        <div class="flex-1">
          <Doughnut :data="chartData" :options="{ ...options, cutout: DOUGHNUT_CUTOUT }" />
        </div>
        <div class="mt-4 flex flex-col items-center gap-2">
          <div v-if="topReason" class="text-xs font-medium text-gray-600 dark:text-dark-300">
            <span class="kicker text-[10.5px]">{{ t('admin.ops.top') }}</span>
            <span class="ml-1.5 font-semibold" :style="{ color: topReason.color }">{{ topReason.label }}</span>
          </div>
          <div class="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
            <div v-for="item in categories" :key="item.label" class="flex items-center gap-1.5 text-xs">
              <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: item.color }"></span>
              <span class="text-gray-500 dark:text-dark-400">{{ item.label }}</span>
              <span class="num text-gray-900 dark:text-white">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex h-full items-center justify-center">
        <div v-if="state === 'loading'" class="animate-pulse text-sm text-gray-400 dark:text-dark-400">{{ t('common.loading') }}</div>
        <EmptyState v-else :title="t('common.noData')" :description="t('admin.ops.charts.emptyError')" />
      </div>
    </div>
  </div>
</template>
