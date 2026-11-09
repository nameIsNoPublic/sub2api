<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { OpsErrorTrendPoint } from '@/api/admin/ops'
import type { ChartState } from '../types'
import { formatHistoryLabel, sumNumbers } from '../utils/opsFormatters'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useOpsChartTheme } from '../utils/useOpsChartTheme'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, Filler)

interface Props {
  points: OpsErrorTrendPoint[]
  loading: boolean
  timeRange: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'openRequestErrors'): void
  (e: 'openUpstreamErrors'): void
}>()
const { t } = useI18n()

const { chrome, semantic, tickFont, legendLabels, tooltip, gridLine, valueAxisBorder, categoryAxisBorder, withAlpha } =
  useOpsChartTheme()
// SLA 错误=危险红，上游错误=警告橙（与错误分布图一致），业务限制=中性灰虚线
const colors = computed(() => ({
  sla: semantic.value.danger,
  slaAlpha: withAlpha(semantic.value.danger, 0.1),
  upstream: semantic.value.warning,
  upstreamAlpha: withAlpha(semantic.value.warning, 0.08),
  limited: semantic.value.neutral
}))

const totalRequestErrors = computed(() => sumNumbers(props.points.map((p) => p.error_count_sla ?? 0)))

const totalUpstreamErrors = computed(() =>
  sumNumbers(
    props.points.map((p) => (p.upstream_error_count_excl_429_529 ?? 0) + (p.upstream_429_count ?? 0) + (p.upstream_529_count ?? 0))
  )
)

const totalDisplayed = computed(() =>
  sumNumbers(props.points.map((p) => (p.error_count_sla ?? 0) + (p.upstream_error_count_excl_429_529 ?? 0) + (p.business_limited_count ?? 0)))
)

const hasRequestErrors = computed(() => totalRequestErrors.value > 0)
const hasUpstreamErrors = computed(() => totalUpstreamErrors.value > 0)

const chartData = computed(() => {
  if (!props.points.length || totalDisplayed.value <= 0) return null
  return {
    labels: props.points.map((p) => formatHistoryLabel(p.bucket_start, props.timeRange)),
    datasets: [
      {
        label: t('admin.ops.errorsSla'),
        data: props.points.map((p) => p.error_count_sla ?? 0),
        borderColor: colors.value.sla,
        backgroundColor: colors.value.slaAlpha,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHitRadius: 10
      },
      {
        label: t('admin.ops.upstreamExcl429529'),
        data: props.points.map((p) => p.upstream_error_count_excl_429_529 ?? 0),
        borderColor: colors.value.upstream,
        backgroundColor: colors.value.upstreamAlpha,
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHitRadius: 10
      },
      {
        label: t('admin.ops.businessLimited'),
        data: props.points.map((p) => p.business_limited_count ?? 0),
        borderColor: colors.value.limited,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [6, 6],
        fill: false,
        tension: 0.35,
        pointRadius: 0,
        pointHitRadius: 10
      }
    ]
  }
})

const state = computed<ChartState>(() => {
  if (chartData.value) return 'ready'
  if (props.loading) return 'loading'
  return 'empty'
})

const options = computed(() => {
  const c = chrome.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: legendLabels.value
      },
      tooltip: {
        ...tooltip.value,
        displayColors: true
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        grid: { display: false },
        border: categoryAxisBorder.value,
        ticks: {
          color: c.muted,
          font: tickFont,
          maxTicksLimit: 8,
          autoSkip: true,
          autoSkipPadding: 10
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: gridLine.value,
        border: valueAxisBorder,
        ticks: { color: c.muted, font: tickFont, precision: 0 }
      }
    }
  }
})
</script>

<template>
  <div class="card flex h-full flex-col p-5">
    <div class="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2">
      <h3 class="section-title flex items-center gap-2 text-sm">
        <svg class="h-4 w-4 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
          />
        </svg>
        {{ t('admin.ops.errorTrend') }}
        <HelpTooltip :content="t('admin.ops.tooltips.errorTrend')" />
      </h3>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn btn-secondary btn-sm px-2.5 py-1 text-[11px]"
          :disabled="!hasRequestErrors"
          @click="emit('openRequestErrors')"
        >
          {{ t('admin.ops.errorDetails.requestErrors') }}
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm px-2.5 py-1 text-[11px]"
          :disabled="!hasUpstreamErrors"
          @click="emit('openUpstreamErrors')"
        >
          {{ t('admin.ops.errorDetails.upstreamErrors') }}
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1">
      <Line v-if="state === 'ready' && chartData" :data="chartData" :options="options" />
      <div v-else class="flex h-full items-center justify-center">
        <div v-if="state === 'loading'" class="animate-pulse text-sm text-gray-400 dark:text-dark-400">{{ t('common.loading') }}</div>
        <EmptyState v-else :title="t('common.noData')" :description="t('admin.ops.charts.emptyError')" />
      </div>
    </div>
  </div>
</template>
