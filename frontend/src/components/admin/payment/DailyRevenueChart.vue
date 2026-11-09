<template>
  <div class="card overflow-hidden">
    <div :class="CHART_CARD_HEADER">
      <h3 :class="CHART_CARD_TITLE">
        {{ t('payment.admin.dailyRevenue') }}
      </h3>
    </div>
    <div class="h-64 p-4">
      <div v-if="loading" class="flex h-full items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
      <Line v-else-if="chartData" :data="chartData" :options="chartOptions" />
      <div
        v-else
        class="flex h-full items-center justify-center text-sm text-gray-500 dark:text-dark-400"
      >
        {{ t('payment.admin.noData') }}
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
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'vue-chartjs'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { CHART_CARD_HEADER, CHART_CARD_TITLE } from '@/components/charts/chartStyles'
import { useChartTheme } from '@/components/charts/useChartTheme'
import { withAlpha } from '@/utils/chartTheme'
import type { DailyPaymentStats } from '@/types/payment'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const { t } = useI18n()

const props = defineProps<{
  data: DailyPaymentStats[]
  loading?: boolean
}>()

const { chrome, semantic, tooltip, series, font } = useChartTheme()

/**
 * 币种收入按 52code 系列色依次取色；订单数固定用 success 语义色，
 * 因此跳过与之相同的系列色（emerald），避免第 3 个币种与订单数撞色。
 */
function revenueColor(index: number): string {
  const palette: string[] = []
  for (let i = 0; palette.length <= index && i < index + 32; i++) {
    const color = series(i)
    if (color !== semantic.value.success) palette.push(color)
  }
  return palette[index] ?? series(index)
}

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) return null
  const currencies = [...new Set(props.data.flatMap(day => Object.keys(day.amount)))].sort()
  return {
    labels: props.data.map(d => d.date),
    datasets: [
      ...currencies.map((currency, index) => {
        const borderColor = revenueColor(index)
        return {
          label: `${currency} ${t('payment.admin.revenue')}`,
          data: props.data.map(day => day.amount[currency] || 0),
          borderColor,
          backgroundColor: withAlpha(borderColor, 0.08),
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
        }
      }),
      {
        label: t('payment.admin.orderCount'),
        data: props.data.map(d => d.count),
        borderColor: semantic.value.success,
        backgroundColor: withAlpha(semantic.value.success, 0.1),
        borderDash: [4, 4],
        fill: false,
        tension: 0.3,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        yAxisID: 'y1',
      }
    ]
  }
})

const chartOptions = computed(() => {
  const tick = { color: chrome.value.muted, font: { family: font.mono, size: 10 } }
  const axisTitle = (text: string) => ({
    display: true,
    text,
    color: chrome.value.muted,
    font: { family: font.family, size: 11 },
  })
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        grid: { display: false },
        border: { color: chrome.value.border },
        ticks: tick,
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: axisTitle(t('payment.admin.revenue')),
        grid: { color: chrome.value.grid },
        border: { display: false },
        ticks: tick,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: axisTitle(t('payment.admin.orderCount')),
        grid: { drawOnChartArea: false },
        border: { display: false },
        ticks: tick,
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: chrome.value.text,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          boxWidth: 6,
          boxHeight: 6,
          font: { family: font.family, size: 11 },
        },
      },
      tooltip: tooltip.value,
    }
  }
})
</script>
