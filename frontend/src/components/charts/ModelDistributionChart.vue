<template>
  <div class="card overflow-hidden">
    <div :class="CHART_CARD_HEADER">
      <h3 :class="CHART_CARD_TITLE">
        {{ !enableRankingView || activeView === 'model_distribution'
          ? t('admin.dashboard.modelDistribution')
          : t('admin.dashboard.spendingRankingTitle') }}
      </h3>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <div v-if="showSourceToggle" :class="SEGMENT_GROUP">
          <button
            type="button"
            :class="segmentButtonClass(source === 'requested')"
            @click="emit('update:source', 'requested')"
          >
            {{ t('usage.requestedModel') }}
          </button>
          <button
            type="button"
            :class="segmentButtonClass(source === 'upstream')"
            @click="emit('update:source', 'upstream')"
          >
            {{ t('usage.upstreamModel') }}
          </button>
          <button
            type="button"
            :class="segmentButtonClass(source === 'mapping')"
            @click="emit('update:source', 'mapping')"
          >
            {{ t('usage.mapping') }}
          </button>
        </div>
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
        <div v-if="enableRankingView" :class="SEGMENT_GROUP">
          <button
            type="button"
            :class="segmentButtonClass(activeView === 'model_distribution')"
            @click="activeView = 'model_distribution'"
          >
            {{ t('admin.dashboard.viewModelDistribution') }}
          </button>
          <button
            type="button"
            :class="segmentButtonClass(activeView === 'spending_ranking')"
            @click="activeView = 'spending_ranking'"
          >
            {{ t('admin.dashboard.viewSpendingRanking') }}
          </button>
        </div>
      </div>
    </div>

    <div class="chart-dist-body p-5">
      <div v-if="activeView === 'model_distribution' && loading" class="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
      <div
        v-else-if="activeView === 'model_distribution' && displayModelStats.length > 0 && chartData"
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
                <th :class="[TABLE_HEAD_CELL, 'text-left']">{{ t('admin.dashboard.model') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.requests') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.tokens') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.actual') }}</th>
                <th v-if="showAccountCost" :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.accountCost') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.standard') }}</th>
              </tr>
            </thead>
            <tbody class="font-mono tabular-nums">
              <template v-for="(model, index) in displayModelStats" :key="model.model">
                <tr
                  :class="[TABLE_ROW, enableBreakdown ? TABLE_ROW_INTERACTIVE : '']"
                  @click="enableBreakdown && toggleBreakdown('model', model.model)"
                >
                  <td
                    class="py-1.5 pr-2 font-medium"
                    :class="enableBreakdown ? INTERACTIVE_NAME : 'text-gray-900 dark:text-white'"
                    :title="model.model"
                  >
                    <div class="flex max-w-[11rem] items-center gap-1.5">
                      <span
                        class="h-2 w-2 shrink-0 rounded-[3px]"
                        :style="{ backgroundColor: modelSwatch(index) }"
                        aria-hidden="true"
                      ></span>
                      <svg v-if="enableBreakdown && expandedKey === `model-${model.model}`" class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                      <svg v-else-if="enableBreakdown" class="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                      <span class="min-w-0 truncate">{{ model.model }}</span>
                    </div>
                  </td>
                  <td class="py-1.5 text-right text-gray-600 dark:text-gray-400">
                    {{ formatNumber(model.requests) }}
                  </td>
                  <td class="py-1.5 text-right text-gray-600 dark:text-gray-400">
                    {{ formatTokens(model.total_tokens) }}
                  </td>
                  <td class="py-1.5 text-right font-medium text-gray-950 dark:text-white">
                    ${{ formatCost(model.actual_cost) }}
                  </td>
                  <td v-if="showAccountCost" class="py-1.5 text-right text-ember-600 dark:text-ember-400">
                    ${{ formatCost(model.account_cost) }}
                  </td>
                  <td class="py-1.5 text-right text-gray-400 dark:text-dark-500">
                    ${{ formatCost(model.cost) }}
                  </td>
                </tr>
                <tr v-if="expandedKey === `model-${model.model}`">
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
        v-else-if="activeView === 'model_distribution'"
        class="flex h-48 items-center justify-center text-sm text-gray-500 dark:text-dark-400"
      >
        {{ t('admin.dashboard.noDataAvailable') }}
      </div>

      <div v-else-if="rankingLoading" class="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
      <div
        v-else-if="rankingError"
        class="flex h-48 items-center justify-center text-sm text-gray-500 dark:text-dark-400"
      >
        {{ t('admin.dashboard.failedToLoad') }}
      </div>
      <div
        v-else-if="rankingDisplayItems.length > 0 && rankingChartData"
        class="chart-dist-layout"
      >
        <div class="relative h-44 w-44 shrink-0">
          <Doughnut :data="rankingChartData" :options="rankingDoughnutOptions" />
          <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-dark-500">
              {{ t('admin.dashboard.spendingRankingSpend') }}
            </span>
            <span class="mt-0.5 font-mono text-base font-semibold tabular-nums tracking-tight text-gray-950 dark:text-white">
              ${{ formatCost(rankingSpendTotal) }}
            </span>
          </div>
        </div>
        <div class="chart-dist-table">
          <table class="w-full whitespace-nowrap text-xs">
            <thead>
              <tr>
                <th :class="[TABLE_HEAD_CELL, 'text-left']">{{ t('admin.dashboard.spendingRankingUser') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.spendingRankingRequests') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.spendingRankingTokens') }}</th>
                <th :class="[TABLE_HEAD_CELL, 'text-right']">{{ t('admin.dashboard.spendingRankingSpend') }}</th>
              </tr>
            </thead>
            <tbody class="font-mono tabular-nums">
              <tr
                v-for="(item, index) in rankingDisplayItems"
                :key="item.isOther ? 'others' : `${item.user_id}-${index}`"
                :class="[
                  TABLE_ROW,
                  item.isOther ? 'bg-gray-50/70 dark:bg-dark-800/30' : TABLE_ROW_INTERACTIVE
                ]"
                @click="item.isOther ? undefined : emit('ranking-click', item)"
              >
                <td class="py-1.5 pr-2">
                  <div class="flex min-w-0 items-center gap-2">
                    <span
                      class="h-2 w-2 shrink-0 rounded-[3px]"
                      :style="{ backgroundColor: item.isOther ? semantic.neutral : rankingSwatch(index) }"
                      aria-hidden="true"
                    ></span>
                    <span class="w-6 shrink-0 text-[11px] font-medium text-gray-400 dark:text-dark-500">
                      {{ item.isOther ? 'Σ' : `#${index + 1}` }}
                    </span>
                    <span
                      class="block max-w-[140px] truncate font-sans font-medium text-gray-900 dark:text-white"
                      :title="getRankingRowLabel(item)"
                    >
                      {{ getRankingRowLabel(item) }}
                    </span>
                  </div>
                </td>
                <td class="py-1.5 text-right text-gray-600 dark:text-gray-400">
                  {{ formatNumber(item.requests) }}
                </td>
                <td class="py-1.5 text-right text-gray-600 dark:text-gray-400">
                  {{ formatTokens(item.tokens) }}
                </td>
                <td class="py-1.5 text-right font-medium text-gray-950 dark:text-white">
                  ${{ formatCost(item.actual_cost) }}
                </td>
              </tr>
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
import type { ModelStat, UserSpendingRankingItem, UserBreakdownItem } from '@/types'
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
const { semantic, tooltip, surface, series } = useChartTheme()

type DistributionMetric = 'tokens' | 'actual_cost'
type ModelSource = 'requested' | 'upstream' | 'mapping'
type RankingDisplayItem = UserSpendingRankingItem & { isOther?: boolean }
const props = withDefaults(defineProps<{
  modelStats: ModelStat[]
  upstreamModelStats?: ModelStat[]
  mappingModelStats?: ModelStat[]
  source?: ModelSource
  enableRankingView?: boolean
  rankingItems?: UserSpendingRankingItem[]
  rankingTotalActualCost?: number
  rankingTotalRequests?: number
  rankingTotalTokens?: number
  loading?: boolean
  metric?: DistributionMetric
  showSourceToggle?: boolean
  showMetricToggle?: boolean
  enableBreakdown?: boolean
  showAccountCost?: boolean
  rankingLoading?: boolean
  rankingError?: boolean
  startDate?: string
  endDate?: string
  filters?: Record<string, any>
}>(), {
  upstreamModelStats: () => [],
  mappingModelStats: () => [],
  source: 'requested',
  enableRankingView: false,
  rankingItems: () => [],
  rankingTotalActualCost: 0,
  rankingTotalRequests: 0,
  rankingTotalTokens: 0,
  loading: false,
  metric: 'tokens',
  showSourceToggle: false,
  showMetricToggle: false,
  enableBreakdown: true,
  showAccountCost: true,
  rankingLoading: false,
  rankingError: false
})

const expandedKey = ref<string | null>(null)
const breakdownItems = ref<UserBreakdownItem[]>([])
const breakdownLoading = ref(false)

const toggleBreakdown = async (type: string, id: string) => {
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
      model: id,
      model_source: props.source,
    })
    breakdownItems.value = res.users || []
  } catch {
    breakdownItems.value = []
  } finally {
    breakdownLoading.value = false
  }
}

const emit = defineEmits<{
  'update:metric': [value: DistributionMetric]
  'update:source': [value: ModelSource]
  'ranking-click': [item: UserSpendingRankingItem]
}>()

const enableRankingView = computed(() => props.enableRankingView)
const showAccountCost = computed(() => props.showAccountCost)
const distributionColspan = computed(() => showAccountCost.value ? 6 : 5)
const activeView = ref<'model_distribution' | 'spending_ranking'>('model_distribution')

const displayModelStats = computed(() => {
  const sourceStats = props.source === 'upstream'
    ? props.upstreamModelStats
    : props.source === 'mapping'
      ? props.mappingModelStats
      : props.modelStats
  if (!sourceStats?.length) return []

  const metricKey = props.metric === 'actual_cost' ? 'actual_cost' : 'total_tokens'
  return [...sourceStats].sort((a, b) => toFiniteNumber(b[metricKey]) - toFiniteNumber(a[metricKey]))
})

/** 模型分布扇区：超过色板容量时尾部并入「其他」，明细表仍列全部模型 */
const modelSlices = computed(() =>
  buildDoughnutSlices(
    displayModelStats.value.map((m) => ({
      label: m.model,
      value: toFiniteNumber(props.metric === 'actual_cost' ? m.actual_cost : m.total_tokens)
    })),
    { colorAt: series, otherColor: semantic.value.neutral, otherLabel: t('admin.dashboard.spendingRankingOther') }
  )
)

const modelSwatch = (index: number) =>
  swatchColorAt(index, modelSlices.value.groupedFrom, series, semantic.value.neutral)

const chartData = computed(() => {
  if (!displayModelStats.value.length) return null
  const slices = modelSlices.value

  return {
    labels: slices.labels,
    datasets: [
      {
        data: slices.data,
        backgroundColor: slices.backgroundColor,
        borderColor: surface.value,
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  }
})

/** 消费排行扇区：上榜用户超出色板容量的部分与「其他」合并为一个中性色扇区 */
const rankingSlices = computed(() =>
  buildDoughnutSlices(
    [
      ...props.rankingItems.map((item, index) => ({
        label: `#${index + 1} ${getRankingUserLabel(item)}`,
        value: toFiniteNumber(item.actual_cost)
      })),
      ...(otherRankingItem.value
        ? [{ label: t('admin.dashboard.spendingRankingOther'), value: otherRankingItem.value.actual_cost, isOther: true }]
        : [])
    ],
    { colorAt: series, otherColor: semantic.value.neutral, otherLabel: t('admin.dashboard.spendingRankingOther') }
  )
)

const rankingSwatch = (index: number) =>
  swatchColorAt(index, rankingSlices.value.groupedFrom, series, semantic.value.neutral)

const rankingChartData = computed(() => {
  if (!props.rankingItems?.length) return null
  const slices = rankingSlices.value

  return {
    labels: slices.labels,
    datasets: [
      {
        data: slices.data,
        backgroundColor: slices.backgroundColor,
        borderColor: surface.value,
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  }
})

/** 环形图中心显示的合计（随指标切换） */
const distributionTotal = computed(() =>
  displayModelStats.value.reduce(
    (sum, m) => sum + toFiniteNumber(props.metric === 'actual_cost' ? m.actual_cost : m.total_tokens),
    0
  )
)

/** 消费排行环形图中心显示的总消费（含「其他」） */
const rankingSpendTotal = computed(() =>
  rankingDisplayItems.value.reduce((sum, item) => sum + toFiniteNumber(item.actual_cost), 0)
)

const otherRankingItem = computed<RankingDisplayItem | null>(() => {
  if (!props.rankingItems?.length) return null

  const rankedActualCost = props.rankingItems.reduce((sum, item) => sum + toFiniteNumber(item.actual_cost), 0)
  const rankedRequests = props.rankingItems.reduce((sum, item) => sum + toFiniteNumber(item.requests), 0)
  const rankedTokens = props.rankingItems.reduce((sum, item) => sum + toFiniteNumber(item.tokens), 0)

  const otherActualCost = Math.max((props.rankingTotalActualCost || 0) - rankedActualCost, 0)
  const otherRequests = Math.max((props.rankingTotalRequests || 0) - rankedRequests, 0)
  const otherTokens = Math.max((props.rankingTotalTokens || 0) - rankedTokens, 0)

  if (otherActualCost <= 0.000001 && otherRequests <= 0 && otherTokens <= 0) return null

  return {
    user_id: 0,
    email: '',
    username: '',
    actual_cost: otherActualCost,
    requests: otherRequests,
    tokens: otherTokens,
    isOther: true
  }
})

const rankingDisplayItems = computed<RankingDisplayItem[]>(() => {
  if (!props.rankingItems?.length) return []
  return otherRankingItem.value
    ? [...props.rankingItems, otherRankingItem.value]
    : [...props.rankingItems]
})

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

const rankingDoughnutOptions = computed(() => ({
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
          return `${context.label}: $${formatCost(value)} (${percentage}%)`
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

const getRankingUserLabel = (item: UserSpendingRankingItem): string => {
  if (item.username?.trim()) return item.username.trim()
  if (item.email?.trim()) return item.email.trim()
  return t('admin.redeem.userPrefix', { id: item.user_id })
}

const getRankingRowLabel = (item: RankingDisplayItem): string => {
  if (item.isOther) return t('admin.dashboard.spendingRankingOther')
  return getRankingUserLabel(item)
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
