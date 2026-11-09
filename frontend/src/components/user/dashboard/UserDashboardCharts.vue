<template>
  <div class="space-y-4">
    <!-- 筛选条：日期范围 + 粒度分段 + 刷新 -->
    <div class="flex flex-wrap items-center gap-2.5">
      <DateRangePicker :start-date="startDate" :end-date="endDate" @update:startDate="$emit('update:startDate', $event)" @update:endDate="$emit('update:endDate', $event)" @change="$emit('dateRangeChange', $event)" />
      <div class="tabs" role="group" :aria-label="t('dashboard.granularity')">
        <button
          v-for="option in granularityOptions"
          :key="option.value"
          type="button"
          :class="['tab', granularity === option.value && 'tab-active']"
          :aria-pressed="granularity === option.value"
          @click="selectGranularity(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <button
        type="button"
        class="btn btn-secondary ml-auto h-[38px] w-[38px] p-0"
        :disabled="loading"
        :title="t('common.refresh')"
        :aria-label="t('common.refresh')"
        @click="$emit('refresh')"
      >
        <Icon name="refresh" size="sm" :class="loading && 'animate-spin'" />
      </button>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <!-- Model Distribution -->
      <section class="card relative flex flex-col overflow-hidden lg:col-span-2">
        <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px] dark:bg-dark-900/60">
          <LoadingSpinner size="md" />
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-dark-800">
          <h3 class="text-sm font-semibold tracking-tight text-gray-950 dark:text-white">{{ t('dashboard.modelDistribution') }}</h3>
          <div v-if="models?.length" class="flex items-center gap-1.5">
            <div :class="SEGMENT_GROUP">
              <button type="button" :class="segmentButtonClass(metric === 'tokens')" :aria-pressed="metric === 'tokens'" @click="metric = 'tokens'">
                {{ t('ui52.dashboard.metricTokens') }}
              </button>
              <button type="button" :class="segmentButtonClass(metric === 'cost')" :aria-pressed="metric === 'cost'" @click="metric = 'cost'">
                {{ t('ui52.dashboard.metricCost') }}
              </button>
            </div>
            <div :class="SEGMENT_GROUP">
              <button
                type="button"
                :class="[segmentButtonClass(view === 'bars'), '!px-1.5']"
                :title="t('ui52.dashboard.viewBars')"
                :aria-label="t('ui52.dashboard.viewBars')"
                :aria-pressed="view === 'bars'"
                @click="view = 'bars'"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4h11M2.5 8h7M2.5 12h4.5" /></svg>
              </button>
              <button
                type="button"
                :class="[segmentButtonClass(view === 'donut'), '!px-1.5']"
                :title="t('ui52.dashboard.viewDonut')"
                :aria-label="t('ui52.dashboard.viewDonut')"
                :aria-pressed="view === 'donut'"
                @click="view = 'donut'"
              >
                <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="8" cy="8" r="5.25" /><path d="M8 2.75V8l4.5 2.6" stroke-linecap="round" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="chart-dist-body flex-1 p-5">
          <div v-if="!rows.length" class="flex h-56 items-center justify-center text-sm text-gray-500 dark:text-dark-400">
            {{ t('dashboard.noDataAvailable') }}
          </div>

          <!-- 条形列表 -->
          <ul
            v-else-if="view === 'bars'"
            class="space-y-3.5"
            :class="expanded && 'max-h-[26rem] overflow-y-auto pr-1'"
          >
            <li v-for="(row, index) in rows" :key="row.key">
              <div class="flex items-baseline justify-between gap-3">
                <span
                  class="min-w-0 truncate text-[13px]"
                  :class="row.isOther ? 'text-gray-500 dark:text-dark-400' : 'font-mono font-medium text-gray-950 dark:text-white'"
                  :title="row.label"
                >
                  {{ row.label }}
                </span>
                <span class="shrink-0 font-mono text-xs tabular-nums">
                  <span class="text-gray-900 dark:text-gray-100">{{ primaryValue(row) }}</span>
                  <span class="ml-2 inline-block w-10 text-right text-gray-500 dark:text-dark-400">{{ formatPercent(row.share) }}</span>
                </span>
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-800">
                <div
                  class="h-full rounded-full transition-[width] duration-500 ease-out"
                  :class="barClass(index, row)"
                  :style="{ width: barWidth(row) }"
                ></div>
              </div>
              <p class="mt-1 truncate font-mono text-[10.5px] text-gray-600 dark:text-dark-300" :title="secondaryLine(row)">
                {{ secondaryLine(row) }}
              </p>
            </li>
          </ul>

          <!-- 环形图 -->
          <div v-else class="chart-dist-layout">
            <div class="relative h-44 w-44 shrink-0">
              <Doughnut v-if="donutData" :data="donutData" :options="doughnutOptions" />
              <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-500 dark:text-dark-400">
                  {{ metric === 'cost' ? t('ui52.dashboard.metricCost') : t('ui52.dashboard.metricTokens') }}
                </span>
                <span class="mt-0.5 font-mono text-base font-semibold tabular-nums tracking-tight text-gray-950 dark:text-white">
                  {{ metric === 'cost' ? `$${formatCost(totals.actual)}` : formatTokens(totals.tokens) }}
                </span>
              </div>
            </div>
            <ul class="chart-dist-table space-y-1.5 pr-1">
              <li v-for="(row, index) in rows" :key="row.key" class="flex items-center gap-2 text-xs">
                <span class="h-2 w-2 shrink-0 rounded-[3px]" :style="{ backgroundColor: legendColor(index, row) }" aria-hidden="true"></span>
                <span
                  class="min-w-0 flex-1 truncate"
                  :class="row.isOther ? 'text-gray-500 dark:text-dark-400' : 'font-mono text-gray-800 dark:text-gray-200'"
                  :title="row.label"
                >
                  {{ row.label }}
                </span>
                <span class="shrink-0 font-mono tabular-nums text-gray-500 dark:text-dark-400">{{ formatPercent(row.share) }}</span>
              </li>
            </ul>
          </div>

          <!-- 展开 / 收起：保证每个模型的明细都能看到 -->
          <button
            v-if="collapsible"
            type="button"
            class="mt-4 inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400 dark:hover:text-primary-300"
            :aria-expanded="expanded"
            @click="expanded = !expanded"
          >
            {{ expanded ? t('ui52.dashboard.collapseModels') : t('ui52.dashboard.showAllModels', { count: modelCount }) }}
            <Icon :name="expanded ? 'chevronUp' : 'chevronDown'" size="xs" />
          </button>
        </div>

        <div
          v-if="rows.length"
          class="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 font-mono text-[11px] tabular-nums dark:border-dark-800"
        >
          <span class="font-sans text-gray-500 dark:text-dark-400">{{ t('ui52.dashboard.total') }}</span>
          <span class="truncate text-gray-500 dark:text-dark-400">
            <span class="text-gray-950 dark:text-white" :title="t('dashboard.actual')">${{ formatCost(totals.actual) }}</span>
            <span :title="t('dashboard.standard')"> / ${{ formatCost(totals.standard) }}</span>
            <span class="mx-1.5 text-gray-300 dark:text-dark-600">·</span>
            {{ formatTokens(totals.tokens) }} {{ t('dashboard.tokens') }}
          </span>
        </div>
      </section>

      <!-- Token Usage Trend Chart -->
      <TokenUsageTrend class="lg:col-span-3" :trend-data="trend" :loading="loading" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import Icon from '@/components/icons/Icon.vue'
import { Doughnut } from 'vue-chartjs'
import TokenUsageTrend from '@/components/charts/TokenUsageTrend.vue'
import { useChartTheme } from '@/components/charts/useChartTheme'
import { DOUGHNUT_CUTOUT, SEGMENT_GROUP, segmentButtonClass } from '@/components/charts/chartStyles'
import '@/components/charts/distribution.css'
import { CHART_SERIES } from '@/utils/chartTheme'
import type { TrendDataPoint, ModelStat } from '@/types'
import { formatCostFixed as formatCost, formatNumberLocaleString as formatNumber, formatTokensK as formatTokens } from '@/utils/format'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{ loading: boolean, startDate: string, endDate: string, granularity: string, trend: TrendDataPoint[], models: ModelStat[] }>()
const emit = defineEmits(['update:startDate', 'update:endDate', 'update:granularity', 'dateRangeChange', 'granularityChange', 'refresh'])
const { t } = useI18n()
const { tooltip, surface, series, semantic } = useChartTheme()

/** 分布展示前 N 个模型，其余合并为「其他」 */
const TOP_N = 6

type DistributionMetric = 'cost' | 'tokens'
type DistributionView = 'bars' | 'donut'

interface DistributionRow {
  key: string
  label: string
  requests: number
  tokens: number
  actual: number
  standard: number
  /** 当前指标占合计的百分比（0~100） */
  share: number
  /** 当前指标原始值，用于条形长度 */
  value: number
  isOther?: boolean
}

/** 分布口径：默认按 Token（与原版一致），可切换到实际费用 */
const metric = ref<DistributionMetric>('tokens')
const view = ref<DistributionView>('bars')
/** 是否展开全部模型（默认只列前 TOP_N 个，其余合并） */
const expanded = ref(false)

// 日期范围 / 刷新带来新数据时收起明细，避免沿用上一份数据的展开状态
watch(() => props.models, () => {
  expanded.value = false
})

const granularityOptions = computed(() => [
  { value: 'day', label: t('dashboard.day') },
  { value: 'hour', label: t('dashboard.hour') }
])

/** 切换粒度：先同步 v-model，再通知父组件重新拉取 */
function selectGranularity(value: string) {
  if (value === props.granularity) return
  emit('update:granularity', value)
  emit('granularityChange')
}

const safe = (value: unknown): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const metricOf = (m: { actual: number; tokens: number }) => (metric.value === 'cost' ? m.actual : m.tokens)

const totals = computed(() =>
  (props.models ?? []).reduce(
    (acc, m) => ({
      requests: acc.requests + safe(m.requests),
      tokens: acc.tokens + safe(m.total_tokens),
      actual: acc.actual + safe(m.actual_cost),
      standard: acc.standard + safe(m.cost)
    }),
    { requests: 0, tokens: 0, actual: 0, standard: 0 }
  )
)

const modelCount = computed(() => props.models?.length ?? 0)
/** 模型数超过 TOP_N + 1 时才需要折叠 */
const collapsible = computed(() => modelCount.value > TOP_N + 1)

/**
 * 生成分布行：merge=true 时只保留前 TOP_N 个，其余合并为「其他」；
 * 恰好多 1 个时直接展示，避免出现「其他 1 个模型」。
 */
function buildRows(merge: boolean): DistributionRow[] {
  const models = props.models ?? []
  if (!models.length) return []

  const base = models.map((m) => ({
    key: m.model,
    label: m.model,
    requests: safe(m.requests),
    tokens: safe(m.total_tokens),
    actual: safe(m.actual_cost),
    standard: safe(m.cost)
  }))
  base.sort((a, b) => metricOf(b) - metricOf(a))

  const shouldMerge = merge && collapsible.value
  const head = shouldMerge ? base.slice(0, TOP_N) : base
  const tail = shouldMerge ? base.slice(TOP_N) : []
  const merged = [...head]
  if (tail.length) {
    merged.push({
      key: '__other__',
      label: t('ui52.dashboard.otherModels', { count: tail.length }),
      requests: tail.reduce((s, r) => s + r.requests, 0),
      tokens: tail.reduce((s, r) => s + r.tokens, 0),
      actual: tail.reduce((s, r) => s + r.actual, 0),
      standard: tail.reduce((s, r) => s + r.standard, 0)
    })
  }

  const total = metricOf(totals.value)
  return merged.map((r, index) => ({
    ...r,
    value: metricOf(r),
    share: total > 0 ? (metricOf(r) / total) * 100 : 0,
    isOther: Boolean(tail.length) && index === merged.length - 1
  }))
}

/** 列表行：未展开时前 TOP_N +「其他」，展开后为全部模型 */
const rows = computed<DistributionRow[]>(() => buildRows(!expanded.value))

/**
 * 展开后模型数超过系列色数量时，环形图仍按前 TOP_N +「其他」绘制，
 * 避免颜色循环导致扇区与图例对应含糊；图例中被并入「其他」的模型使用中性色。
 */
const donutGrouped = computed(() => rows.value.length > CHART_SERIES.length)
const donutRows = computed<DistributionRow[]>(() => (donutGrouped.value ? buildRows(true) : rows.value))

const maxValue = computed(() => rows.value.reduce((max, r) => (r.isOther ? max : Math.max(max, r.value)), 0))

/** 条形长度相对第一名，保证头部模型撑满宽度；非零值至少露出 2% */
function barWidth(row: DistributionRow): string {
  if (maxValue.value <= 0 || row.value <= 0) return '0%'
  return `${Math.max(2, Math.min(100, (row.value / maxValue.value) * 100))}%`
}

function barClass(index: number, row: DistributionRow): string {
  if (row.isOther) return 'bg-gray-300 dark:bg-dark-600'
  if (index === 0) return 'bg-primary-600 dark:bg-primary-400'
  return 'bg-primary-400/70 dark:bg-primary-500/60'
}

function primaryValue(row: DistributionRow): string {
  return metric.value === 'cost' ? `$${formatCost(row.actual)}` : formatTokens(row.tokens)
}

/** 条形下方的明细：请求数 · Token · 实际 / 标准费用 */
function secondaryLine(row: DistributionRow): string {
  const requests = t('ui52.dashboard.requestsCount', { count: formatNumber(row.requests) })
  return `${requests} · ${formatTokens(row.tokens)} ${t('dashboard.tokens')} · $${formatCost(row.actual)} / $${formatCost(row.standard)}`
}

function formatPercent(share: number): string {
  if (share <= 0) return '0%'
  if (share < 0.5) return '<1%'
  return share >= 10 ? `${Math.round(share)}%` : `${share.toFixed(1)}%`
}

function donutColor(index: number, row: DistributionRow): string {
  return row.isOther ? semantic.value.neutral : series(index)
}

/** 图例色：与环形图扇区一一对应，被并入「其他」扇区的模型显示中性色 */
function legendColor(index: number, row: DistributionRow): string {
  if (donutGrouped.value && index >= TOP_N) return semantic.value.neutral
  return donutColor(index, row)
}

const donutData = computed(() => {
  if (!donutRows.value.length) return null
  return {
    labels: donutRows.value.map((r) => r.label),
    datasets: [{
      data: donutRows.value.map((r) => r.value),
      backgroundColor: donutRows.value.map((r, index) => donutColor(index, r)),
      borderColor: surface.value,
      borderWidth: 2,
      hoverOffset: 4
    }]
  }
})

const doughnutOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: DOUGHNUT_CUTOUT,
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltip.value,
      callbacks: {
        label: (context: any) => {
          const value = context.parsed as number
          return metric.value === 'cost'
            ? `${context.label}: $${formatCost(value)}`
            : `${context.label}: ${formatTokens(value)} tokens`
        }
      }
    }
  }
}))
</script>
