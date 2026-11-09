<template>
  <div class="card flex flex-col overflow-hidden">
    <div :class="CHART_CARD_HEADER">
      <h3 :class="CHART_CARD_TITLE">
        {{ t('admin.dashboard.tokenUsageTrend') }}
      </h3>
      <span
        v-if="!loading && totalTokens > 0"
        class="font-mono text-xs tabular-nums text-gray-500 dark:text-dark-400"
      >
        Σ {{ formatTokens(totalTokens) }}
      </span>
    </div>
    <!--
      图表区 flex-1 撑满卡片剩余高度（与相邻卡片等高时不留空白），画布最小约 280px。
      画布放在绝对定位层里，避免 Chart.js 尺寸反向撑高网格行。
    -->
    <div class="relative min-h-[308px] flex-1 px-4 pb-4 pt-3">
      <div class="absolute inset-x-4 bottom-4 top-3">
        <div v-if="loading" class="flex h-full items-center justify-center">
          <LoadingSpinner />
        </div>
        <Line v-else-if="trendData.length > 0 && chartData" :data="chartData" :options="lineOptions" />
        <div
          v-else
          class="flex h-full items-center justify-center text-sm text-gray-500 dark:text-dark-400"
        >
          {{ t('admin.dashboard.noDataAvailable') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import type { TrendDataPoint } from '@/types'
import { withAlpha } from '@/utils/chartTheme'
import { useChartTheme } from './useChartTheme'
import { CHART_CARD_HEADER, CHART_CARD_TITLE } from './chartStyles'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const { t } = useI18n()

const props = defineProps<{
  trendData: TrendDataPoint[]
  loading?: boolean
}>()

const { chrome, semantic, tooltip, surface, font } = useChartTheme()

/** 区间内 Token 总量（输入 + 输出 + 缓存），显示在卡片右上角 */
const totalTokens = computed(() =>
  (props.trendData ?? []).reduce(
    (sum, d) => sum + d.input_tokens + d.output_tokens + d.cache_creation_tokens + d.cache_read_tokens,
    0
  )
)

/**
 * 细线、无数据点，仅悬停时显示圆点。
 * 只有 1 个时间点时（如「今天」按天）无法连线，必须显示数据点，否则图表为空。
 */
const lineStyle = (color: string) => ({
  borderColor: color,
  backgroundColor: color,
  borderWidth: 1.75,
  pointRadius: props.trendData.length <= 1 ? 3 : 0,
  pointHoverRadius: 3.5,
  pointHoverBorderWidth: 2,
  pointHoverBackgroundColor: color,
  pointHoverBorderColor: surface.value,
  tension: 0.35,
  fill: false
})

const chartData = computed(() => {
  if (!props.trendData?.length) return null
  const colors = semantic.value

  return {
    labels: props.trendData.map((d) => d.date),
    datasets: [
      {
        label: 'Input',
        data: props.trendData.map((d) => d.input_tokens),
        ...lineStyle(colors.input),
        // 主系列铺一层极淡面积，其余系列只描线，避免叠色发脏
        backgroundColor: withAlpha(colors.input, 0.08),
        fill: 'origin' as const
      },
      {
        label: 'Output',
        data: props.trendData.map((d) => d.output_tokens),
        ...lineStyle(colors.output)
      },
      {
        label: 'Cache Creation',
        data: props.trendData.map((d) => d.cache_creation_tokens),
        ...lineStyle(colors.cacheCreation)
      },
      {
        label: 'Cache Read',
        data: props.trendData.map((d) => d.cache_read_tokens),
        ...lineStyle(colors.cacheRead)
      },
      {
        label: 'Cache Hit Rate',
        data: props.trendData.map((d) => {
          const totalPromptTokens = d.input_tokens + d.cache_read_tokens + d.cache_creation_tokens
          return totalPromptTokens > 0 ? (d.cache_read_tokens / totalPromptTokens) * 100 : 0
        }),
        ...lineStyle(colors.cacheHitRate),
        borderWidth: 1.5,
        borderDash: [4, 4],
        yAxisID: 'yPercent'
      }
    ]
  }
})

const lineOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  plugins: {
    legend: {
      position: 'top' as const,
      align: 'start' as const,
      labels: {
        color: chrome.value.text,
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 6,
        boxHeight: 6,
        padding: 14,
        font: {
          family: font.family,
          size: 11
        }
      }
    },
    tooltip: {
      ...tooltip.value,
      callbacks: {
        label: (context: any) => {
          if (context.dataset.yAxisID === 'yPercent') {
            return `${context.dataset.label}: ${context.raw.toFixed(1)}%`
          }
          return `${context.dataset.label}: ${formatTokens(context.raw)}`
        },
        footer: (tooltipItems: any) => {
          const dataIndex = tooltipItems[0]?.dataIndex
          if (dataIndex !== undefined && props.trendData[dataIndex]) {
            const data = props.trendData[dataIndex]
            return `Actual: $${formatCost(data.actual_cost)} | Standard: $${formatCost(data.cost)}`
          }
          return ''
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      border: {
        color: chrome.value.border
      },
      ticks: {
        color: chrome.value.muted,
        maxRotation: 0,
        autoSkipPadding: 12,
        font: {
          family: font.mono,
          size: 10
        }
      }
    },
    y: {
      grid: {
        color: chrome.value.grid
      },
      border: {
        display: false
      },
      ticks: {
        color: chrome.value.muted,
        padding: 6,
        font: {
          family: font.mono,
          size: 10
        },
        callback: (value: string | number) => formatTokens(Number(value))
      }
    },
    yPercent: {
      position: 'right' as const,
      min: 0,
      max: 100,
      grid: {
        drawOnChartArea: false
      },
      border: {
        display: false
      },
      ticks: {
        color: semantic.value.cacheHitRate,
        padding: 6,
        font: {
          family: font.mono,
          size: 10
        },
        callback: (value: string | number) => `${value}%`
      }
    }
  }
}))

const formatTokens = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`
  } else if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toLocaleString()
}

const formatCost = (value: number): string => {
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + 'K'
  } else if (value >= 1) {
    return value.toFixed(2)
  } else if (value >= 0.01) {
    return value.toFixed(3)
  }
  return value.toFixed(4)
}
</script>
