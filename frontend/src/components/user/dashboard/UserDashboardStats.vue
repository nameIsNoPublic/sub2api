<template>
  <!-- 账户概览：余额主卡与六项用量指标，数据均来自现有统计接口。 -->
  <div class="dashboard-overview">
    <section class="balance-panel">
      <header class="balance-panel__header">
        <h2>
          <span class="signal-dot" aria-hidden="true"></span
          >{{
            t(
              isSimple
                ? 'dashboard.apiKeys'
                : 'ui52.dashboard.hero.accountBalance'
            )
          }}
        </h2>
        <span class="overview-badge">{{
          t('ui52.dashboard.hero.overview')
        }}</span>
      </header>

      <template v-if="!isSimple">
        <div class="balance-panel__amount-row">
          <p class="balance-panel__amount" data-testid="account-balance">
            <template v-if="balanceVisible"
              ><span class="balance-panel__currency">$</span>{{ balanceParts[0]
              }}<span class="balance-panel__decimal"
                >.{{ balanceParts[1] }}</span
              ></template
            >
            <span v-else class="balance-panel__masked">••••••</span>
          </p>
          <button
            type="button"
            class="balance-panel__visibility"
            :aria-label="
              t(
                balanceVisible
                  ? 'ui52.dashboard.hero.hideBalance'
                  : 'ui52.dashboard.hero.showBalance'
              )
            "
            :aria-pressed="!balanceVisible"
            @click="balanceVisible = !balanceVisible"
          >
            <Icon :name="balanceVisible ? 'eye' : 'eyeOff'" size="sm" />
          </button>
        </div>
        <p v-if="totalSaved > 0" class="balance-panel__savings">
          {{ t('ui52.dashboard.hero.savings') }}
          <strong class="text-gradient">${{ formatUsd(totalSaved) }}</strong>
          <span>{{
            t('ui52.dashboard.hero.savedPct', { percent: savedPercent })
          }}</span>
        </p>

        <div class="balance-summary">
          <div>
            <span class="balance-summary__label">{{
              t('ui52.dashboard.hero.avg7d')
            }}</span>
            <strong>{{
              dailyAvgCost == null ? '—' : `$${formatUsd(dailyAvgCost)}`
            }}</strong>
          </div>
          <div>
            <span class="balance-summary__label">{{
              t('ui52.dashboard.hero.runway')
            }}</span>
            <strong>{{
              balanceVisible && runwayDays
                ? t('ui52.dashboard.hero.days', { days: runwayDays })
                : '—'
            }}</strong>
          </div>
        </div>
        <div class="balance-trend">
          <div class="balance-trend__heading">
            <span>{{ t('ui52.dashboard.hero.spend7d') }}</span>
            <strong>{{
              dailyAvgCost == null ? '—' : `$${formatUsd(weeklyCost)}`
            }}</strong>
          </div>
          <svg
            v-if="costSpark"
            class="overview-spark balance-trend__chart"
            viewBox="0 0 100 28"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon
              :points="costSpark.area"
              fill="currentColor"
              opacity="0.08"
            />
            <polyline
              :points="costSpark.line"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              vector-effect="non-scaling-stroke"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
          <p v-else class="balance-trend__empty">
            {{ t('dashboard.noDataAvailable') }}
          </p>
        </div>
      </template>
      <template v-else>
        <p class="balance-panel__amount">{{ stats?.total_api_keys || 0 }}</p>
        <p class="balance-panel__savings">
          <strong class="overview-accent">{{ stats?.active_api_keys || 0 }}</strong
          >{{ t('common.active') }}
        </p>
      </template>

      <nav
        class="balance-panel__actions"
        :aria-label="t('dashboard.quickActions')"
      >
        <button
          v-if="!isSimple"
          type="button"
          class="hero-btn-primary"
          @click="go('/purchase')"
        >
          <Icon name="plus" size="sm" :stroke-width="2" />{{
            t('ui52.dashboard.hero.recharge')
          }}
        </button>
        <button
          type="button"
          :class="isSimple ? 'hero-btn-primary' : 'hero-btn'"
          @click="go('/keys')"
        >
          {{ t('dashboard.createApiKey') }}
        </button>
        <button
          v-if="!isSimple"
          type="button"
          class="hero-btn"
          @click="go('/redeem')"
        >
          {{ t('dashboard.redeemCode') }}
        </button>
        <button type="button" class="hero-btn" @click="go('/usage')">
          {{ t('ui52.dashboard.hero.useLogs') }}
        </button>
      </nav>
    </section>

    <div class="overview-metrics">
      <section class="stat-tile">
        <header class="stat-tile__header">
          <div class="stat-tile__heading">
            <span class="stat-icon stat-icon-success h-7 w-7" aria-hidden="true">
              <Icon name="dollar" size="xs" :stroke-width="2" />
            </span>
            <h3 class="stat-tile__label">{{ t('dashboard.todayCost') }}</h3>
          </div>
          <span class="stat-tile__meta stat-tile__tag"
            >{{ t('dashboard.actual') }} / {{ t('dashboard.standard') }}</span
          >
        </header>
        <p class="stat-tile__value">
          ${{ formatOverviewCost(stats?.today_actual_cost || 0)
          }}<s :title="t('dashboard.standard')"
            >${{ formatOverviewCost(stats?.today_cost || 0) }}</s
          >
        </p>
        <div class="stat-tile__footer">
          <p class="stat-tile__sub">
            {{ t('common.total') }}
            <strong :title="t('dashboard.actual')"
              >${{ formatOverviewCost(stats?.total_actual_cost || 0) }}</strong
            >
          </p>
          <p class="stat-tile__sub">
            <s :title="t('dashboard.standard')"
              >${{ formatOverviewCost(stats?.total_cost || 0) }}</s
            >
            <span>{{ t('dashboard.standard') }}</span>
          </p>
        </div>
      </section>

      <section class="stat-tile">
        <header class="stat-tile__header">
          <div class="stat-tile__heading">
            <span class="stat-icon stat-icon-primary h-7 w-7" aria-hidden="true">
              <Icon name="key" size="xs" :stroke-width="2" />
            </span>
            <h3 class="stat-tile__label">{{ t('dashboard.apiKeys') }}</h3>
          </div>
          <button type="button" class="stat-tile__link" @click="go('/keys')">
            {{ t('ui52.dashboard.metrics.manage') }}
          </button>
        </header>
        <p class="stat-tile__value">
          {{ stats?.total_api_keys || 0
          }}<span class="stat-tile__unit">{{
            t('ui52.dashboard.metrics.keysUnit')
          }}</span>
        </p>
        <div class="stat-tile__footer">
          <div class="stat-tile__split stat-tile__sub">
            <span
              ><strong class="overview-accent">{{
                stats?.active_api_keys || 0
              }}</strong>
              {{ t('common.active') }}</span
            ><span v-if="activeKeyPercent != null"
              >{{ activeKeyPercent }}%</span
            >
          </div>
          <div
            v-if="activeKeyPercent != null"
            class="metric-track"
            role="meter"
            :aria-label="t('common.active')"
            :aria-valuenow="activeKeyPercent"
            :aria-valuemin="0"
            :aria-valuemax="100"
          >
            <div
              class="metric-track__fill"
              :style="{ width: `${activeKeyPercent}%` }"
            ></div>
          </div>
        </div>
      </section>

      <section class="stat-tile">
        <header class="stat-tile__header">
          <div class="stat-tile__heading">
            <span class="stat-icon stat-icon-info h-7 w-7" aria-hidden="true">
              <Icon name="chart" size="xs" :stroke-width="2" />
            </span>
            <h3 class="stat-tile__label">{{ t('dashboard.todayRequests') }}</h3>
          </div>
          <span class="stat-tile__meta">{{ t('dashboard.last7Days') }}</span>
        </header>
        <p class="stat-tile__value">
          {{ formatNumber(stats?.today_requests || 0)
          }}<span class="stat-tile__unit">{{
            t('ui52.dashboard.metrics.requestsUnit')
          }}</span>
        </p>
        <div class="stat-tile__footer">
          <svg
            v-if="requestSpark"
            class="overview-spark"
            viewBox="0 0 100 28"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon
              :points="requestSpark.area"
              fill="currentColor"
              opacity="0.1"
            />
            <polyline
              :points="requestSpark.line"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              vector-effect="non-scaling-stroke"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
          <p class="stat-tile__sub">
            {{ t('common.total') }}
            <strong>{{ formatNumber(stats?.total_requests || 0) }}</strong>
            {{ t('ui52.dashboard.metrics.requestsUnit') }}
          </p>
        </div>
      </section>

      <section class="stat-tile">
        <header class="stat-tile__header">
          <div class="stat-tile__heading">
            <span class="stat-icon stat-icon-warning h-7 w-7" aria-hidden="true">
              <Icon name="database" size="xs" :stroke-width="2" />
            </span>
            <h3 class="stat-tile__label">{{ t('dashboard.totalTokens') }}</h3>
          </div>
          <span v-if="cacheSharePercent != null" class="overview-badge">{{
            t('ui52.dashboard.metrics.cacheShare', {
              percent: cacheSharePercent
            })
          }}</span>
        </header>
        <p class="stat-tile__value">
          {{ formatTokens(stats?.total_tokens || 0) }}
        </p>
        <div class="stat-tile__footer">
          <div
            class="metric-track token-track"
            :title="tokenBreakdown('total')"
            aria-hidden="true"
          >
            <span
              v-for="segment in tokenSegments"
              :key="segment.key"
              :class="`token-color--${segment.key}`"
              :style="{ width: `${segment.percent}%` }"
            ></span>
          </div>
          <div class="token-legend">
            <span
              v-for="segment in tokenSegments"
              :key="segment.key"
              :title="`${t(`dashboard.${segment.key}`)} ${formatNumber(segment.value)}`"
              ><i :class="`token-color--${segment.key}`" aria-hidden="true"></i
              >{{ t(`dashboard.${segment.key}`) }}
              {{ formatTokens(segment.value) }}</span
            >
          </div>
        </div>
      </section>

      <section class="stat-tile">
        <header class="stat-tile__header">
          <div class="stat-tile__heading">
            <span class="stat-icon stat-icon-ember h-7 w-7" aria-hidden="true">
              <Icon name="cube" size="xs" :stroke-width="2" />
            </span>
            <h3 class="stat-tile__label">{{ t('dashboard.todayTokens') }}</h3>
          </div>
          <span class="stat-tile__meta">{{ t('dashboard.last7Days') }}</span>
        </header>
        <p class="stat-tile__value">
          {{ formatTokens(stats?.today_tokens || 0) }}
        </p>
        <div class="stat-tile__footer">
          <svg
            v-if="tokenSpark"
            class="overview-spark overview-spark--orange"
            viewBox="0 0 100 28"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon
              :points="tokenSpark.area"
              fill="currentColor"
              opacity="0.1"
            />
            <polyline
              :points="tokenSpark.line"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              vector-effect="non-scaling-stroke"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
          </svg>
          <p class="stat-tile__sub" :title="tokenBreakdown('today')">
            {{ tokenBreakdown('today') }}
          </p>
        </div>
      </section>

      <section class="stat-tile">
        <header class="stat-tile__header">
          <div class="stat-tile__heading">
            <span class="stat-icon stat-icon-info h-7 w-7" aria-hidden="true">
              <Icon name="clock" size="xs" :stroke-width="2" />
            </span>
            <h3 class="stat-tile__label">{{ t('dashboard.avgResponse') }}</h3>
          </div>
        </header>
        <p class="stat-tile__value">
          {{ responseValue
          }}<span class="stat-tile__unit">{{ responseUnit }}</span>
        </p>
        <div class="response-details stat-tile__footer">
          <div>
            <span>RPM</span><strong>{{ formatTokens(stats?.rpm || 0) }}</strong>
          </div>
          <div>
            <span>TPM</span><strong>{{ formatTokens(stats?.tpm || 0) }}</strong>
          </div>
        </div>
      </section>
    </div>
  </div>

</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Icon from '@/components/icons/Icon.vue'
import type { UserDashboardStats as UserStatsType } from '@/api/usage'
import type { TrendDataPoint } from '@/types'

const props = defineProps<{
  stats: UserStatsType
  balance: number
  isSimple: boolean
  /** 近 7 日（按天）趋势，用于 hero 派生指标与 sparkline；缺省时相关 UI 自动隐藏 */
  trend?: TrendDataPoint[] | null
}>()
const { t } = useI18n()
const router = useRouter()
const balanceVisible = ref(true)
const balanceParts = computed(() => formatBalance(props.balance).split('.'))
const responseValue = computed(() => {
  const ms = props.stats?.average_duration_ms || 0
  return ms >= 1000 ? (ms / 1000).toFixed(2) : ms.toFixed(0)
})
const responseUnit = computed(() =>
  (props.stats?.average_duration_ms || 0) >= 1000 ? 's' : 'ms'
)

/** 构成条使用互斥的输入、输出与缓存计数归一化；零用量时保留空轨道。 */
const tokenSegments = computed(() => {
  const segments = [
    { key: 'input', value: props.stats?.total_input_tokens || 0 },
    { key: 'output', value: props.stats?.total_output_tokens || 0 },
    {
      key: 'cache',
      value:
        (props.stats?.total_cache_creation_tokens || 0) +
        (props.stats?.total_cache_read_tokens || 0)
    }
  ]
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return segments.map((segment) => ({
    ...segment,
    percent: total > 0 ? (segment.value / total) * 100 : 0
  }))
})

const go = (path: string) => { router?.push(path) }

// ---- hero 派生指标（全部由已有数据推导，不新增接口） ----

/** 累计节省 = 标准计费 - 实际扣除 */
const totalSaved = computed(() => Math.max(0, (props.stats?.total_cost || 0) - (props.stats?.total_actual_cost || 0)))
const savedPercent = computed(() => {
  const total = props.stats?.total_cost || 0
  if (total <= 0) return '0'
  return ((totalSaved.value / total) * 100).toFixed(1)
})

/** 近 7 日日均实际消费；缺失趋势时为 null，模板显示占位。 */
const dailyAvgCost = computed<number | null>(() => {
  const points = props.trend
  if (!points || points.length === 0) return null
  const sum = points.reduce((s, p) => s + (p.actual_cost || 0), 0)
  return sum / points.length
})

/** 预计可用天数 = 余额 / 日均消费；超过 999 显示 ">999" */
const runwayDays = computed<string | null>(() => {
  const avg = dailyAvgCost.value
  if (avg == null || avg <= 0 || props.balance <= 0) return null
  const days = Math.floor(props.balance / avg)
  return days > 999 ? '>999' : String(days)
})

/** 累计 Token 中缓存读取的占比 */
const cacheSharePercent = computed<string | null>(() => {
  const total = props.stats?.total_tokens || 0
  if (total <= 0) return null
  return (((props.stats?.total_cache_read_tokens || 0) / total) * 100).toFixed(1)
})

/** 启用密钥占比（0-100 取整），没有密钥时为 null（隐藏进度条） */
const activeKeyPercent = computed<number | null>(() => {
  const total = props.stats?.total_api_keys || 0
  if (total <= 0) return null
  return Math.round(((props.stats?.active_api_keys || 0) / total) * 100)
})

// ---- sparkline（inline SVG，viewBox 100x28） ----

interface Spark { line: string; area: string }

/** 把数值序列按 min-max 归一化成 polyline 坐标串；少于 2 个点画不出线，返回 null 隐藏图形 */
function buildSpark(values: number[]): Spark | null {
  if (values.length < 2) return null
  const w = 100
  const h = 28
  const pad = 2
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / (values.length - 1)
    const y = h - pad - ((v - min) / span) * (h - 2 * pad)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = pts.join(' ')
  const area = `${line} ${(w - pad).toFixed(1)},${h} ${pad},${h}`
  return { line, area }
}

const weeklyCost = computed(() =>
  (props.trend ?? []).reduce((sum, point) => sum + (point.actual_cost || 0), 0)
)
const costSpark = computed(() =>
  buildSpark((props.trend ?? []).map((point) => point.actual_cost || 0))
)

const requestSpark = computed(() => buildSpark((props.trend ?? []).map((p) => p.requests || 0)))
const tokenSpark = computed(() => buildSpark((props.trend ?? []).map((p) => p.total_tokens || 0)))

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

const formatBalance = (b: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(b)

const formatNumber = (n: number) => n.toLocaleString()
/** 概览金额使用千位分隔，保留 2–4 位小数以兼顾小额计费精度。 */
const formatOverviewCost = (cost: number) =>
  cost.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  })
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
</script>

<style scoped>
/* 配色取自 aihubx dev-uiux 的 main.css，仅作用于账户概览。 */
.dashboard-overview {
  --overview-primary: #4b57f5;
  --overview-primary-soft: #eef0ff;
  --overview-orange: #f06a3c;
  --overview-orange-soft: #fff0e9;
  --overview-paper: #fbfcff;
  --overview-surface: #fff;
  --overview-ink: #10131b;
  --overview-muted: #6f7582;
  --overview-line: #e5e7ee;
  display: grid;
  gap: 20px;
  color: var(--overview-ink);
}
.dark .dashboard-overview {
  --overview-primary: #929bff;
  --overview-primary-soft: #222744;
  --overview-orange: #ff9976;
  --overview-orange-soft: #352822;
  --overview-paper: #151923;
  --overview-surface: #191e2a;
  --overview-ink: #f0f4fb;
  --overview-muted: #a4afc1;
  --overview-line: #2d3545;
}
.balance-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 26px;
  border: 1px solid
    color-mix(in srgb, var(--overview-primary) 22%, var(--overview-line));
  border-radius: 24px;
  background: linear-gradient(
    125deg,
    var(--overview-paper),
    var(--overview-primary-soft) 78%,
    var(--overview-orange-soft) 150%
  );
}
.balance-panel__header,
.stat-tile__header,
.balance-trend__heading,
.stat-tile__split {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
/* 眉题化：等宽大写小标题，与全局 .kicker 同一节奏 */
.balance-panel__header h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--overview-muted);
  font-family: 'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.overview-badge {
  flex-shrink: 0;
  padding: 4px 8px;
  border-radius: 20px;
  background: var(--overview-primary-soft);
  color: var(--overview-primary);
  font-size: 11px;
  font-weight: 500;
}
.balance-panel__amount-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  margin-top: 22px;
}
.balance-panel__amount {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: clamp(32px, 3vw, 48px);
  font-weight: 650;
  line-height: 1.12;
  letter-spacing: -0.045em;
  font-variant-numeric: tabular-nums;
}
.balance-panel__currency,
.balance-panel__decimal {
  color: var(--overview-muted);
  font-size: 0.5em;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.balance-panel__currency {
  margin-right: 5px;
}
.balance-panel__visibility {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--overview-muted);
  transition:
    color 150ms,
    background 150ms;
}
.balance-panel__visibility:hover {
  color: var(--overview-primary);
  background: var(--overview-surface);
}
.balance-panel__masked {
  letter-spacing: 0.1em;
}
.balance-panel__savings {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 12px;
  color: var(--overview-muted);
  font-size: 12px;
}
.balance-panel__savings > span,
.balance-panel__savings .overview-accent {
  color: var(--overview-primary);
}
.balance-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 24px;
}
.balance-summary > div + div {
  padding-left: 20px;
  border-left: 1px solid var(--overview-line);
}
.balance-summary__label {
  display: block;
  margin-bottom: 6px;
  color: var(--overview-muted);
  font-size: 12px;
}
.balance-summary strong {
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.balance-trend {
  padding: 14px 16px 10px;
  margin-top: 20px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--overview-surface) 72%, transparent);
}
.balance-trend__heading {
  color: var(--overview-muted);
  font-size: 12px;
}
.balance-trend__heading strong {
  color: var(--overview-ink);
  font-variant-numeric: tabular-nums;
}
.balance-trend__empty {
  padding: 15px 0;
  font-size: 12px;
  color: var(--overview-muted);
}
.balance-panel__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
  padding-top: 22px;
}
.hero-btn,
.hero-btn-primary {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid var(--overview-line);
  border-radius: 11px;
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  transition:
    background 150ms,
    border-color 150ms,
    transform 150ms;
}
.hero-btn {
  background: var(--overview-surface);
  color: var(--overview-ink);
}
.hero-btn:hover {
  border-color: var(--overview-primary);
  color: var(--overview-primary);
}
.hero-btn-primary {
  border-color: transparent;
  background: #4b57f5;
  color: white;
  box-shadow: 0 4px 10px -5px #4b57f5;
}
.hero-btn-primary:hover {
  background: #3543df;
}
.hero-btn:active,
.hero-btn-primary:active {
  transform: translateY(1px);
}
.overview-metrics {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}
.stat-tile {
  display: flex;
  min-width: 0;
  min-height: 186px;
  flex-direction: column;
  padding: 22px;
  border: 1px solid var(--overview-line);
  border-radius: 22px;
  background: var(--overview-surface);
  transition:
    border-color 160ms,
    transform 160ms,
    box-shadow 160ms;
}
.stat-tile:hover {
  border-color: color-mix(
    in srgb,
    var(--overview-primary) 32%,
    var(--overview-line)
  );
  transform: translateY(-1px);
  box-shadow: 0 4px 12px -6px rgb(23 24 28 / 0.14);
}
.stat-tile__header {
  flex-wrap: wrap;
  row-gap: 5px;
}
/* 标签行左侧的彩色 icon 底块 + 眉题组合（stat-icon 配色自带深色模式） */
.stat-tile__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
/* 眉题化：与全局 .kicker 同一节奏（等宽 / 大写 / 0.14em 字距） */
.stat-tile__label {
  color: var(--overview-muted);
  font-family: 'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.stat-tile__meta {
  color: var(--overview-muted);
  font-size: 11px;
}
.stat-tile__tag {
  padding: 3px 7px;
  border-radius: 20px;
  background: var(--overview-paper);
}
.stat-tile__link {
  color: var(--overview-primary);
  font-size: 12px;
}
.stat-tile__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.stat-tile__value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.035em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.stat-tile__value s {
  color: var(--overview-muted);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
}
.stat-tile__unit {
  font-size: 13px;
  font-weight: 400;
  color: var(--overview-muted);
  letter-spacing: 0;
}
.stat-tile__footer {
  margin-top: auto;
  padding-top: 20px;
}
.stat-tile__sub {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: 4px;
  margin-top: 7px;
  color: var(--overview-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.stat-tile__sub strong {
  color: var(--overview-ink);
  font-weight: 500;
}
.stat-tile__split {
  justify-content: space-between;
}
.stat-tile__sub .overview-accent {
  color: var(--overview-primary);
}
.metric-track {
  display: flex;
  height: 6px;
  overflow: hidden;
  border-radius: 10px;
  margin-top: 9px;
  background: var(--overview-primary-soft);
}
.metric-track__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--overview-primary), #8993ff);
  transition: width 300ms;
}
.overview-spark {
  display: block;
  width: 100%;
  height: 36px;
  color: var(--overview-primary);
  overflow: visible;
}
.overview-spark--orange {
  color: var(--overview-orange);
}
.balance-trend__chart {
  height: 35px;
  margin-top: 12px;
}
.token-track {
  gap: 2px;
}
.token-track span {
  height: 100%;
  transition: width 300ms;
}
.token-color--input {
  background: var(--overview-primary);
}
.token-color--output {
  background: var(--overview-orange);
}
.token-color--cache {
  background: #a4adfa;
}
.token-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 8px;
  margin-top: 9px;
  color: var(--overview-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.token-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.token-legend i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
.response-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.response-details > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px;
  border: 1px solid var(--overview-line);
  border-radius: 9px;
  background: var(--overview-paper);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.response-details span {
  color: var(--overview-muted);
}
.response-details strong {
  font-weight: 500;
}
@media (min-width: 560px) {
  .overview-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .balance-panel__actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .dashboard-overview {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  }
  .overview-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .stat-tile {
    padding: 20px;
    min-height: 196px;
  }
  .balance-panel__actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1600px) {
  .balance-panel {
    padding: 28px;
  }
  .balance-panel__actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .stat-tile {
    padding: 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dashboard-overview *,
  .dashboard-overview *::before,
  .dashboard-overview *::after {
    transition: none !important;
  }
  .stat-tile:hover {
    transform: none;
  }
}
</style>
