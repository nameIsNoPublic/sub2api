<template>
  <div class="card overflow-hidden">
    <div :class="CHART_CARD_HEADER">
      <h3 :class="CHART_CARD_TITLE">
        {{ t('admin.dashboard.groupDistribution') }}
      </h3>
      <div v-if="showMetricToggle" :class="SEGMENT_GROUP">
        <button
          type="button"
          :class="segmentButtonClass(metric === 'tokens')"
          @click="emit('update:metric', 'tokens')"
        >
          {{ t('admin.dashboard.metricTokens') }}
        </button>
        <button
          type="button"
          :class="segmentButtonClass(metric === 'actual_cost')"
          @click="emit('update:metric', 'actual_cost')"
        >
          {{ t('admin.dashboard.metricActualCost') }}
        </button>
      </div>
    </div>
    <div class="chart-dist-body p-5">
      <div v-if="loading" class="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
      <div
        v-else-if="displayGroupStats.length > 0 && chartData"
        class="chart-dist-layout"
      >
        <div class="relative h-44 w-44 shrink-0">
          <Doughnut :data="chartData" :options="doughnutOptions" />
          <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-dark-500">
              {{ metric === 'actual_cost' ? t('admin.dashboard.actual') : t('admin.dashboard.tokens') }}
            </span>
            <span class="mt-0.5 font-mono text-base font-semibold tabular-nums tracking-tight text-gray-950 dark:text-white">
              {{ metric === 'actual_cost' ? `$${formatCost(distributionTotal)}` : formatTokens(distributionTotal) }}
            </span>
          </div>
        </div>
        <div class="chart-dist-table">
          <table class="w-full whitespace-nowrap text-xs">
            <thead>
              <tr>
                <th :class="[TABLE_HEAD_CELL, 'text-left']">{{ t('admin.dashboard.group') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.requests') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.tokens') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.actual') }}</th>
                <th v-if="showAccountCost" :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.accountCost') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.standard') }}</th>
              </tr>
            </thead>
            <tbody class="font-mono tabular-nums">
              <template v-for="(group, index) in displayGroupStats" :key="group.group_id">
                <tr
                  :class="[TABLE_ROW, enableBreakdown && group.group_id > 0 ? TABLE_ROW_INTERACTIVE : '']"
                  @click="enableBreakdown && group.group_id > 0 && toggleBreakdown('group', group.group_id)"
                >
                  <td
                    class="py-1.5 pr-2 font-sans font-medium"
                    :class="enableBreakdown && group.group_id > 0 ? INTERACTIVE_NAME : 'text-gray-900 dark:text-white'"
                    :title="group.group_name || String(group.group_id)"
                  >
                    <div class="flex max-w-[11rem] items-center gap-1.5">
                      <span
                        class="h-2 w-2 shrink-0 rounded-[3px]"
                        :style="{ backgroundColor: swatch(index) }"
                        aria-hidden="true"
                      ></span>
                      <svg v-if="enableBreakdown && group.group_id > 0 && expandedKey === `group-${group.group_id}`" class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                      <svg v-else-if="enableBreakdown && group.group_id > 0" class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                      <span class="min-w-0 truncate">{{ group.group_name || t('admin.dashboard.noGroup') }}</span>
                    </div>
                  </td>
                  <td class="py-1.5 text-right text-gray-600 dark:text-gray-400">
                    {{ formatNumber(group.requests) }}
                  </td>
                  <td class="py-1.5 text-right text-gray-600 dark:text-gray-400">
                    {{ formatTokens(group.total_tokens) }}
                  </td>
                  <td class="py-1.5 text-right font-medium text-gray-950 dark:text-white">
                    ${{ formatCost(group.actual_cost) }}
                  </td>
                  <td v-if="showAccountCost" class="py-1.5 text-right text-ember-600 dark:text-ember-400">
                    ${{ formatCost(group.account_cost) }}
                  </td>
                  <td class="py-1.5 text-right text-gray-400 dark:text-dark-500">
                    ${{ formatCost(group.cost) }}
                  </td>
                </tr>
                <!-- User breakdown sub-rows -->
                <tr v-if="expandedKey === `group-${group.group_id}`">
                  <td :colspan="distributionColspan" class="p-0">
                    <UserBreakdownSubTable
                      :items="breakdownItems"
                      :loading="breakdownLoading"
                      :show-account-cost="showAccountCost"
                    />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
      <div
        v-else
        class="flex h-48 items-center justify-center text-sm text-gray-500 dark:text-dark-400"
      >
        {{ t('admin.dashboard.noDataAvailable') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import UserBreakdownSubTable from './UserBreakdownSubTable.vue'
import type { GroupStat, UserBreakdownItem } from '@/types'
import { getUserBreakdown } from '@/api/admin/dashboard'
import { useChartTheme } from './useChartTheme'
import './distribution.css'
import { buildDoughnutSlices, swatchColorAt } from './doughnutSlices'
import {
  CHART_CARD_HEADER,
  CHART_CARD_TITLE,
  DOUGHNUT_CUTOUT,
  INTERACTIVE_NAME,
  SEGMENT_GROUP,
  TABLE_HEAD_CELL,
  TABLE_ROW,
  TABLE_ROW_INTERACTIVE,
  segmentButtonClass
} from './chartStyles'

ChartJS.register(ArcElement, Tooltip, Legend)

const { t } = useI18n()
const { tooltip, surface, series, semantic } = useChartTheme()

type DistributionMetric = 'tokens' | 'actual_cost'

const props = withDefaults(defineProps<{
  groupStats: GroupStat[]
  loading?: boolean
  metric?: DistributionMetric
  showMetricToggle?: boolean
  enableBreakdown?: boolean
  showAccountCost?: boolean
  startDate?: string
  endDate?: string
  filters?: Record<string, any>
}>(), {
  loading: false,
  metric: 'tokens',
  showMetricToggle: false,
  enableBreakdown: true,
  showAccountCost: true,
})

const emit = defineEmits<{
  'update:metric': [value: DistributionMetric]
}>()

const expandedKey = ref<string | null>(null)
const breakdownItems = ref<UserBreakdownItem[]>([])
const breakdownLoading = ref(false)
const showAccountCost = computed(() => props.showAccountCost)
const distributionColspan = computed(() => showAccountCost.value ? 6 : 5)

const toggleBreakdown = async (type: string, id: number | string) => {
  const key = `${type}-${id}`
  if (expandedKey.value === key) {
    expandedKey.value = null
    return
  }
  expandedKey.value = key
  breakdownLoading.value = true
  breakdownItems.value = []
  try {
    const res = await getUserBreakdown({
      ...props.filters,
      start_date: props.startDate,
      end_date: props.endDate,
      group_id: Number(id),
    })
    breakdownItems.value = res.users || []
  } catch {
    breakdownItems.value = []
  } finally {
    breakdownLoading.value = false
  }
}

const displayGroupStats = computed(() => {
  if (!props.groupStats?.length) return []

  const metricKey = props.metric === 'actual_cost' ? 'actual_cost' : 'total_tokens'
  return [...props.groupStats].sort((a, b) => toFiniteNumber(b[metricKey]) - toFiniteNumber(a[metricKey]))
})

/** 扇区：超过色板容量时尾部并入「其他」，明细表仍列全部条目 */
const slices = computed(() =>
  buildDoughnutSlices(
    displayGroupStats.value.map((g) => ({
      label: g.group_name || String(g.group_id),
      value: toFiniteNumber(props.metric === 'actual_cost' ? g.actual_cost : g.total_tokens)
    })),
    { colorAt: series, otherColor: semantic.value.neutral, otherLabel: t('admin.dashboard.spendingRankingOther') }
  )
)

const swatch = (index: number) =>
  swatchColorAt(index, slices.value.groupedFrom, series, semantic.value.neutral)

const chartData = computed(() => {
  if (!props.groupStats?.length) return null

  return {
    labels: slices.value.labels,
    datasets: [
      {
        data: slices.value.data,
        backgroundColor: slices.value.backgroundColor,
        borderColor: surface.value,
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  }
})

/** 环形图中心显示的合计（随指标切换） */
const distributionTotal = computed(() =>
  displayGroupStats.value.reduce(
    (sum, g) => sum + toFiniteNumber(props.metric === 'actual_cost' ? g.actual_cost : g.total_tokens),
    0
  )
)

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: DOUGHNUT_CUTOUT,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      ...tooltip.value,
      callbacks: {
        label: (context: any) => {
          const value = context.raw as number
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
          const formattedValue = props.metric === 'actual_cost'
            ? `$${formatCost(value)}`
            : formatTokens(value)
          return `${context.label}: ${formattedValue} (${percentage}%)`
        }
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

const formatNumber = (value: number): string => {
  return toFiniteNumber(value).toLocaleString()
}

const toFiniteNumber = (value: unknown): number => {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const formatCost = (value: number | null | undefined): string => {
  const safeValue = toFiniteNumber(value)
  if (safeValue >= 1000) {
    return (safeValue / 1000).toFixed(2) + 'K'
  } else if (safeValue >= 1) {
    return safeValue.toFixed(2)
  } else if (safeValue >= 0.01) {
    return safeValue.toFixed(3)
  }
  return safeValue.toFixed(4)
}
</script>
