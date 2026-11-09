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
import type { OpsThroughputTrendPoint } from '@/api/admin/ops'
import type { ChartState } from '../types'
import { formatHistoryLabel, sumNumbers } from '../utils/opsFormatters'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useOpsChartTheme } from '../utils/useOpsChartTheme'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, Filler)

interface Props {
  points: OpsThroughputTrendPoint[]
  loading: boolean
  timeRange: string
  fullscreen?: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()

const { chrome, semantic, tickFont, legendLabels, tooltip, gridLine, valueAxisBorder, categoryAxisBorder, withAlpha } =
  useOpsChartTheme()

const totalRequests = computed(() => sumNumbers(props.points.map((p) => p.request_count)))

const chartData = computed(() => {
  if (!props.points.length || totalRequests.value <= 0) return null
  return {
    labels: props.points.map((p) => formatHistoryLabel(p.bucket_start, props.timeRange)),
    datasets: [
      {
        label: t('admin.ops.switchRate'),
        data: props.points.map((p) => {
          const requests = p.request_count ?? 0
          const switches = p.switch_count ?? 0
          if (requests <= 0) return 0
          return switches / requests
        }),
        // 切换率属于 ember 信号色：换号越多越值得关注
        borderColor: semantic.value.output,
        backgroundColor: withAlpha(semantic.value.output, 0.1),
        borderWidth: 2,
        fill: true,
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
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            const value = typeof context?.parsed?.y === 'number' ? context.parsed.y : 0
            return `${t('admin.ops.switchRate')}: ${value.toFixed(3)}`
          }
        }
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
        ticks: {
          color: c.muted,
          font: tickFont,
          callback: (value: any) => Number(value).toFixed(3)
        }
      }
    }
  }
})
</script>

<template>
  <div class="card flex h-full flex-col p-5">
    <div class="mb-4 flex shrink-0 items-center justify-between">
      <h3 class="section-title flex items-center gap-2 text-sm">
        <svg class="h-4 w-4 text-ember-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10M7 12h6m-6 5h3" />
        </svg>
        {{ t('admin.ops.switchRateTrend') }}
        <HelpTooltip v-if="!props.fullscreen" :content="t('admin.ops.tooltips.switchRateTrend')" />
      </h3>
    </div>

    <div class="min-h-0 flex-1">
      <Line v-if="state === 'ready' && chartData" :data="chartData" :options="options" />
      <div v-else class="flex h-full items-center justify-center">
        <div v-if="state === 'loading'" class="animate-pulse text-sm text-gray-400 dark:text-dark-400">{{ t('common.loading') }}</div>
        <EmptyState v-else :title="t('common.noData')" :description="t('admin.ops.charts.emptyRequest')" />
      </div>
    </div>
  </div>
</template>
