<template>
  <!-- Row 1: 余额卡 + 指标拼贴网格 -->
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <!-- 余额（简易模式下改为展示 API 密钥） -->
    <section class="card relative flex min-h-[13rem] flex-col overflow-hidden p-5 sm:p-6">
      <div
        class="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-dot-grid bg-dot-sm opacity-70 dark:bg-dot-grid-dark"
        style="mask-image: linear-gradient(225deg, #000 0%, transparent 62%); -webkit-mask-image: linear-gradient(225deg, #000 0%, transparent 62%)"
        aria-hidden="true"
      ></div>

      <template v-if="!isSimple">
        <p class="kicker relative">{{ t('dashboard.balance') }}</p>
        <p
          class="relative mt-4 truncate text-4xl font-semibold leading-none tracking-tightest text-gray-950 tabular-nums dark:text-white sm:text-[2.75rem]"
          :title="`$${formatBalance(balance)}`"
        >
          <span class="mr-0.5 align-top text-2xl font-medium text-gray-400 dark:text-dark-400 sm:text-[1.75rem]">$</span>{{ formatBalance(balance) }}
        </p>
        <p class="relative mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-dark-400">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"></span>
          {{ t('common.available') }}
        </p>

        <div class="relative mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-dark-800">
          <span class="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-dark-400">
            <Icon name="key" size="sm" :stroke-width="1.75" />
            {{ t('dashboard.apiKeys') }}
          </span>
          <span class="font-mono text-sm tabular-nums">
            <span class="font-medium text-gray-950 dark:text-white">{{ stats?.total_api_keys || 0 }}</span>
            <span class="mx-1.5 text-gray-300 dark:text-dark-600">·</span>
            <span class="text-emerald-600 dark:text-emerald-400">{{ stats?.active_api_keys || 0 }}</span>
            <span class="ml-1 font-sans text-xs text-gray-500 dark:text-dark-400">{{ t('common.active') }}</span>
          </span>
        </div>
      </template>

      <template v-else>
        <p class="kicker relative">{{ t('dashboard.apiKeys') }}</p>
        <p class="relative mt-4 text-4xl font-semibold leading-none tracking-tightest text-gray-950 tabular-nums dark:text-white sm:text-[2.75rem]">
          {{ stats?.total_api_keys || 0 }}
        </p>
        <p class="relative mt-3 inline-flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-dark-400">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"></span>
          <span class="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{{ stats?.active_api_keys || 0 }}</span>
          {{ t('common.active') }}
        </p>
      </template>
    </section>

    <!-- 指标网格：1px 内分隔线拼贴 -->
    <div class="panel-grid grid-cols-2 lg:col-span-2 xl:grid-cols-3">
      <!-- Today Requests -->
      <div class="flex min-w-0 flex-col p-4 sm:p-5">
        <p class="kicker">{{ t('dashboard.todayRequests') }}</p>
        <p class="mt-2.5 truncate text-xl font-semibold tracking-tight text-gray-950 tabular-nums dark:text-white sm:text-2xl">
          {{ formatNumber(stats?.today_requests || 0) }}
        </p>
        <p class="mt-auto truncate pt-2 font-mono text-[11px] text-gray-500 dark:text-dark-400">
          {{ t('common.total') }}: {{ formatNumber(stats?.total_requests || 0) }}
        </p>
      </div>

      <!-- Today Cost -->
      <div class="flex min-w-0 flex-col p-4 sm:p-5">
        <p class="kicker">{{ t('dashboard.todayCost') }}</p>
        <p class="mt-2.5 text-xl font-semibold tracking-tight text-gray-950 tabular-nums dark:text-white sm:text-2xl">
          <span :title="t('dashboard.actual')">${{ formatCost(stats?.today_actual_cost || 0) }}</span>
          <span class="ml-1 whitespace-nowrap text-sm font-normal text-gray-400 dark:text-dark-500" :title="t('dashboard.standard')">/ ${{ formatCost(stats?.today_cost || 0) }}</span>
        </p>
        <p class="mt-auto truncate pt-2 font-mono text-[11px]">
          <span class="text-gray-500 dark:text-dark-400">{{ t('common.total') }}: </span>
          <span class="text-gray-800 dark:text-gray-200" :title="t('dashboard.actual')">${{ formatCost(stats?.total_actual_cost || 0) }}</span>
          <span class="text-gray-400 dark:text-dark-500" :title="t('dashboard.standard')"> / ${{ formatCost(stats?.total_cost || 0) }}</span>
        </p>
      </div>

      <!-- Today Tokens -->
      <div class="flex min-w-0 flex-col p-4 sm:p-5">
        <p class="kicker">{{ t('dashboard.todayTokens') }}</p>
        <p class="mt-2.5 truncate text-xl font-semibold tracking-tight text-gray-950 tabular-nums dark:text-white sm:text-2xl">
          {{ formatTokens(stats?.today_tokens || 0) }}
        </p>
        <p class="mt-auto truncate pt-2 font-mono text-[11px] text-gray-500 dark:text-dark-400" :title="tokenBreakdown('today')">
          {{ tokenBreakdown('today') }}
        </p>
      </div>

      <!-- Total Tokens -->
      <div class="flex min-w-0 flex-col p-4 sm:p-5">
        <p class="kicker">{{ t('dashboard.totalTokens') }}</p>
        <p class="mt-2.5 truncate text-xl font-semibold tracking-tight text-gray-950 tabular-nums dark:text-white sm:text-2xl">
          {{ formatTokens(stats?.total_tokens || 0) }}
        </p>
        <p class="mt-auto truncate pt-2 font-mono text-[11px] text-gray-500 dark:text-dark-400" :title="tokenBreakdown('total')">
          {{ tokenBreakdown('total') }}
        </p>
      </div>

      <!-- Performance (RPM/TPM) -->
      <div class="flex min-w-0 flex-col p-4 sm:p-5">
        <p class="kicker">{{ t('dashboard.performance') }}</p>
        <p class="mt-2.5 truncate text-xl font-semibold tracking-tight text-gray-950 tabular-nums dark:text-white sm:text-2xl">
          {{ formatTokens(stats?.rpm || 0) }}
          <span class="ml-0.5 font-mono text-xs font-medium text-gray-400 dark:text-dark-500">RPM</span>
        </p>
        <p class="mt-auto truncate pt-2 font-mono text-[11px] text-gray-500 dark:text-dark-400">
          <span class="text-gray-800 dark:text-gray-200">{{ formatTokens(stats?.tpm || 0) }}</span> TPM
        </p>
      </div>

      <!-- Avg Response Time -->
      <div class="flex min-w-0 flex-col p-4 sm:p-5">
        <p class="kicker">{{ t('dashboard.avgResponse') }}</p>
        <p class="mt-2.5 truncate text-xl font-semibold tracking-tight text-gray-950 tabular-nums dark:text-white sm:text-2xl">
          {{ formatDuration(stats?.average_duration_ms || 0) }}
        </p>
        <p class="mt-auto truncate pt-2 font-mono text-[11px] text-gray-500 dark:text-dark-400">
          {{ t('dashboard.averageTime') }}
        </p>
      </div>
    </div>
  </div>

  <!-- Row 2: Per-platform breakdown -->
  <section v-if="!isSimple && platformCards.length > 0" class="card overflow-hidden">
    <div class="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-dark-800">
      <h3 class="text-sm font-semibold tracking-tight text-gray-950 dark:text-white">{{ t('dashboard.platformBreakdown') }}</h3>
      <span class="font-mono text-xs text-gray-500 dark:text-dark-400">
        {{ t('dashboard.platformCount', { count: platformCount }) }}
      </span>
    </div>
    <div class="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="item in platformCards"
        :key="item.platform"
        data-testid="platform-card"
        :data-platform="item.platform"
        :class="[
          'rounded-lg border p-3.5 transition-colors',
          item.isOther
            ? 'border-dashed border-gray-300 bg-gray-50/70 dark:border-dark-700 dark:bg-dark-950/40'
            : 'border-gray-200/80 bg-white hover:border-gray-300 dark:border-dark-800 dark:bg-dark-900 dark:hover:border-dark-700'
        ]"
      >
        <div class="flex items-baseline justify-between gap-3">
          <span class="truncate text-sm font-semibold text-gray-950 dark:text-white">
            {{ item.isOther ? t('dashboard.platformOther') : platformLabel(item.platform) }}
          </span>
          <span class="font-mono text-sm font-semibold tabular-nums text-gray-950 dark:text-white" :title="t('dashboard.actual')">
            ${{ formatCost(item.total_actual_cost) }}
          </span>
        </div>
        <div class="mt-3 space-y-1.5 text-xs">
          <div class="flex items-center justify-between gap-3">
            <span class="text-gray-500 dark:text-dark-400">{{ t('dashboard.todayCost') }}</span>
            <span class="font-mono tabular-nums text-gray-900 dark:text-gray-100">${{ formatCost(item.today_actual_cost) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-gray-500 dark:text-dark-400">{{ t('dashboard.requests') }}</span>
            <span class="font-mono tabular-nums text-gray-700 dark:text-gray-300">
              {{ item.total_requests > 0 ? formatNumber(item.total_requests) : '-' }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-gray-500 dark:text-dark-400">{{ t('dashboard.tokens') }}</span>
            <span class="font-mono tabular-nums text-gray-700 dark:text-gray-300">
              {{ item.total_tokens > 0 ? formatTokens(item.total_tokens) : '-' }}
            </span>
          </div>
        </div>

        <!-- Quota 区：仅当 quota 配置存在、非 __other__ 且至少有一个窗口配了 limit 时显示 -->
        <div v-if="hasAnyLimit(item.quota) && !item.isOther" class="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-dark-800">
          <p class="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-dark-500">
            {{ t('dashboard.platformQuota.title') }}
          </p>
          <template v-for="w in (['daily', 'weekly', 'monthly'] as const)" :key="w">
            <div v-if="quotaVal(item.quota, `${w}_limit_usd`) != null" class="space-y-1">
              <!-- limit=0：完全禁用 -->
              <template v-if="(quotaVal(item.quota, `${w}_limit_usd`) as number) === 0">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-gray-600 dark:text-gray-300">{{ t(`dashboard.platformQuota.${w}`) }}</span>
                  <span class="font-mono text-red-600 dark:text-red-400">{{ t('dashboard.platformQuota.disabled') }}</span>
                </div>
                <div class="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-800">
                  <div class="h-full w-full rounded-full bg-red-500" />
                </div>
              </template>
              <!-- limit>0：正常用量进度条 -->
              <template v-else>
                <div class="flex items-center justify-between gap-2 text-xs">
                  <span class="text-gray-600 dark:text-gray-300">{{ t(`dashboard.platformQuota.${w}`) }}</span>
                  <span class="font-mono tabular-nums text-gray-700 dark:text-gray-200">
                    ${{ formatUsd((quotaVal(item.quota, `${w}_usage_usd`) as number) ?? 0) }}<span class="text-gray-400 dark:text-dark-500"> / ${{ formatUsd(quotaVal(item.quota, `${w}_limit_usd`) as number) }}</span>
                  </span>
                </div>
                <div class="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-800">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="quotaBarClass(calcPercent((quotaVal(item.quota, `${w}_usage_usd`) as number) ?? 0, quotaVal(item.quota, `${w}_limit_usd`) as number))"
                    :style="{ width: calcPercent((quotaVal(item.quota, `${w}_usage_usd`) as number) ?? 0, quotaVal(item.quota, `${w}_limit_usd`) as number) + '%' }"
                  />
                </div>
                <p v-if="quotaVal(item.quota, `${w}_window_resets_at`)" class="font-mono text-[10px] text-gray-400 dark:text-dark-500">
                  {{ t('dashboard.platformQuota.resetsAt', { time: formatResetTime(quotaVal(item.quota, `${w}_window_resets_at`) as string) }) }}
                </p>
              </template>
            </div>
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { PlatformDashboardStats, UserDashboardStats as UserStatsType } from '@/api/usage'
import type { PlatformQuotaItem } from '@/types'

interface FusedPlatformCard {
  platform: string
  total_actual_cost: number
  today_actual_cost: number
  total_requests: number
  total_tokens: number
  isOther?: boolean
  quota?: PlatformQuotaItem
}

const props = defineProps<{
  stats: UserStatsType
  balance: number
  isSimple: boolean
  platformQuotas?: PlatformQuotaItem[] | null
}>()
const { t } = useI18n()

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
  typesafe: 'TypeSafe / Jev',
}

const platformLabel = (p: string) => PLATFORM_LABELS[p] ?? p

// 处理"各平台之和 < 总值"的差值：后端按平台聚合时过滤了无法归属平台的行
// （group 与 account 都缺 platform）。这里把差值作为"其他"卡片显式展示，
// 避免 Row 1 总值与 Row 3 平台拆分加总对不上、用户困惑。
const OTHER_THRESHOLD = 0.0001
const platformCards = computed<FusedPlatformCard[]>(() => {
  // 建立 by_platform Map
  const byPlat = new Map<string, PlatformDashboardStats>()
  for (const item of props.stats?.by_platform ?? []) byPlat.set(item.platform, item)

  // 建立 quota Map。三档全空的记录不产生卡片，挂到卡片上也不渲染配额区。
  const byQuota = new Map<string, PlatformQuotaItem>()
  for (const q of props.platformQuotas ?? []) byQuota.set(q.platform, q)

  // 卡片集合 = 有用量的平台 ∪ 至少配置了一档限额的平台。
  // 三档全空的限额记录等价于不限额，不单独产生卡片。
  // 后端 by_platform / quota 接口均不会返回 platform='__other__'，
  // 无需显式排除；__other__ 由下方差值补差逻辑单独追加。
  const platforms = new Set<string>(byPlat.keys())
  for (const [platform, q] of byQuota) {
    if (hasAnyLimit(q)) platforms.add(platform)
  }

  const PLATFORM_ORDER = ['anthropic', 'openai', 'gemini', 'antigravity', 'grok', 'typesafe']
  const cards: FusedPlatformCard[] = []

  for (const p of platforms) {
    const stat = byPlat.get(p)
    cards.push({
      platform: p,
      total_actual_cost: stat?.total_actual_cost ?? 0,
      today_actual_cost: stat?.today_actual_cost ?? 0,
      total_requests: stat?.total_requests ?? 0,
      total_tokens: stat?.total_tokens ?? 0,
      quota: byQuota.get(p),
    })
  }

  // 排序：按 PLATFORM_ORDER，未知平台按名称排序
  cards.sort((a, b) => {
    const ai = PLATFORM_ORDER.indexOf(a.platform)
    const bi = PLATFORM_ORDER.indexOf(b.platform)
    if (ai === -1 && bi === -1) return a.platform.localeCompare(b.platform)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })

  // __other__ 补差逻辑：只对 by_platform 有 usage 数据的总和计算
  const total = props.stats?.total_actual_cost ?? 0
  const today = props.stats?.today_actual_cost ?? 0
  const sumTotal = cards.reduce((s, c) => s + c.total_actual_cost, 0)
  const sumToday = cards.reduce((s, c) => s + c.today_actual_cost, 0)
  const diffTotal = Math.max(0, total - sumTotal)
  const diffToday = Math.max(0, today - sumToday)

  if (diffTotal > OTHER_THRESHOLD || diffToday > OTHER_THRESHOLD) {
    cards.push({
      platform: '__other__',
      total_actual_cost: diffTotal,
      today_actual_cost: diffToday,
      total_requests: 0,
      total_tokens: 0,
      isOther: true,
    })
  }

  return cards
})

// 标题右侧的平台计数 = 实际渲染的平台卡片数，不含"其他"差额卡。
const platformCount = computed(() => platformCards.value.filter((c) => !c.isOther).length)

// Quota helpers

type QuotaWindow = 'daily' | 'weekly' | 'monthly'
type QuotaField = `${QuotaWindow}_limit_usd` | `${QuotaWindow}_usage_usd` | `${QuotaWindow}_window_resets_at`

function quotaVal(q: PlatformQuotaItem | undefined, key: QuotaField): PlatformQuotaItem[QuotaField] {
  return q?.[key]
}

function hasAnyLimit(q: PlatformQuotaItem | undefined): boolean {
  if (!q) return false
  return q.daily_limit_usd != null || q.weekly_limit_usd != null || q.monthly_limit_usd != null
}

function calcPercent(usage: number, limit: number): number {
  if (!limit || limit <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((usage / limit) * 100)))
}

function quotaBarClass(p: number): string {
  if (p >= 95) return 'bg-red-500'
  if (p >= 75) return 'bg-amber-500'
  return 'bg-primary-500 dark:bg-primary-400'
}

// 与 formatBalance 一致使用 Intl.NumberFormat 做半偶舍入，避免 toFixed 在不同 JS 引擎
// 下偶发截断而非四舍五入（与后端展示精度不一致）。
const usdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '0.00'
  return usdFormatter.format(n)
}

function formatResetTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const formatBalance = (b: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(b)

const formatNumber = (n: number) => n.toLocaleString()
const formatCost = (c: number) => c.toFixed(4)
const formatTokens = (t: number) => {
  if (t >= 1_000_000) return `${(t / 1_000_000).toFixed(1)}M`
  if (t >= 1000) return `${(t / 1000).toFixed(1)}K`
  return t.toString()
}
/** 指标格副标题：输入 · 输出 · 缓存 的 Token 构成 */
function tokenBreakdown(scope: 'today' | 'total'): string {
  const st = props.stats
  const input = scope === 'today' ? st?.today_input_tokens : st?.total_input_tokens
  const output = scope === 'today' ? st?.today_output_tokens : st?.total_output_tokens
  const cache =
    scope === 'today'
      ? (st?.today_cache_creation_tokens || 0) + (st?.today_cache_read_tokens || 0)
      : (st?.total_cache_creation_tokens || 0) + (st?.total_cache_read_tokens || 0)
  return [
    `${t('dashboard.input')} ${formatTokens(input || 0)}`,
    `${t('dashboard.output')} ${formatTokens(output || 0)}`,
    `${t('dashboard.cache')} ${formatTokens(cache)}`
  ].join(' · ')
}

const formatDuration = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(0)}ms`
</script>
