<template>
  <section class="dashboard-panel channel-summary" :aria-busy="loading">
    <header class="dashboard-panel__header">
      <h2 class="dashboard-panel__title">{{ t('nav.channelStatus') }}</h2>
      <span
        class="channel-summary__overall"
        :class="`channel-state--${summaryState}`"
      >
        <i aria-hidden="true"></i
        >{{ t(`ui52.dashboard.channelStatus.${summaryLabel}`) }}
      </span>
    </header>

    <div v-if="loading && !rows.length" class="channel-summary__empty">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="!rows.length" class="channel-summary__empty">
      <Icon name="chart" size="lg" />
      <p>
        {{
          t(
            failed
              ? 'channelStatus.loadError'
              : 'ui52.dashboard.channelStatus.empty'
          )
        }}
      </p>
      <button
        v-if="failed"
        type="button"
        class="dashboard-link"
        @click="reload"
      >
        {{ t('ui52.dashboard.channelStatus.retry') }}
      </button>
    </div>
    <div v-else class="channel-summary__rows">
      <article
        v-for="row in rows.slice(0, 5)"
        :key="row.id"
        class="channel-summary__row"
      >
        <div class="channel-summary__row-heading">
          <h3 :title="row.name">{{ row.name }}</h3>
          <span :class="`channel-state--${row.state}`">{{
            t(`ui52.dashboard.channelStatus.${row.state}`)
          }}</span>
          <span
            class="channel-summary__rate"
            :title="
              t(
                isV1
                  ? 'ui52.dashboard.channelStatus.availability7d'
                  : 'ui52.dashboard.channelStatus.success24h'
              )
            "
            >{{ row.rate == null ? '—' : `${row.rate.toFixed(2)}%` }}</span
          >
        </div>
        <div
          class="channel-summary__bars"
          :aria-label="`${row.name} · ${t(`ui52.dashboard.channelStatus.${row.state}`)}`"
        >
          <span
            v-for="(point, index) in row.points"
            :key="index"
            class="channel-summary__bar"
            :class="`channel-state--${point.state}`"
            :title="
              point.time
                ? `${formatTime(point.time)} · ${t(`ui52.dashboard.channelStatus.${point.state}`)}`
                : t('ui52.dashboard.channelStatus.unknown')
            "
          ></span>
        </div>
      </article>
    </div>

    <footer class="channel-summary__footer">
      <p class="channel-summary__caption">
        {{
          t(
            isV1
              ? 'ui52.dashboard.channelStatus.availability7d'
              : 'ui52.dashboard.channelStatus.success24h'
          )
        }}
        · {{ t('ui52.dashboard.channelStatus.recentBuckets') }}
      </p>
      <p v-if="failed && rows.length" class="channel-state--warning">
        {{ t('ui52.dashboard.channelStatus.stale') }}
      </p>
      <div class="channel-summary__axis">
        <span>{{ t('monitorCommon.past') }}</span
        ><span>{{ t('monitorCommon.now') }}</span>
      </div>
      <RouterLink to="/monitor" class="dashboard-link channel-summary__details"
        >{{ t('ui52.dashboard.channelStatus.details') }}
        <Icon name="arrowRight" size="xs"
      /></RouterLink>
    </footer>
  </section>
</template>

<script setup lang="ts">
/** 仪表盘渠道摘要：兼容主动探活 V1 与被动观测 V2，使用用户只读接口。 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { channelMonitorUserAPI } from '@/api/channelMonitor'
import { getMatrix, type HealthState } from '@/api/channelMonitorV2'
import {
  getChannelMonitorMode,
  getChannelMonitorRefreshIntervalSeconds
} from '@/utils/featureFlags'
import { useChannelMonitorFormat } from '@/composables/useChannelMonitorFormat'

type State = HealthState
interface Point {
  state: State
  time: string
}
interface ChannelRow {
  id: string
  name: string
  state: State
  rate: number | null
  points: Point[]
}

const { t } = useI18n()
const { providerLabel } = useChannelMonitorFormat()
const isV1 = computed(() => getChannelMonitorMode() === 'v1')
const rows = ref<ChannelRow[]>([])
const loading = ref(false)
const failed = ref(false)
// 固定显示最近 32 个真实区间；不足的左侧留灰，避免把缺失记录展示为正常。
const POINT_COUNT = 32
let controller: AbortController | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const summaryState = computed<State>(() => {
  if (failed.value || !rows.value.length) return 'unknown'
  if (rows.value.some((row) => row.state === 'critical')) return 'critical'
  if (rows.value.some((row) => row.state === 'warning')) return 'warning'
  return rows.value.every((row) => row.state === 'healthy')
    ? 'healthy'
    : 'unknown'
})
const summaryLabel = computed(() =>
  failed.value
    ? 'loadFailed'
    : summaryState.value === 'healthy'
      ? 'allHealthy'
      : summaryState.value
)

function paddedPoints(points: Point[]): Point[] {
  const recent = points.slice(-POINT_COUNT)
  return [
    ...Array.from({ length: POINT_COUNT - recent.length }, () => ({
      state: 'unknown' as State,
      time: ''
    })),
    ...recent
  ]
}

function probeState(status: string): State {
  if (status === 'operational') return 'healthy'
  if (status === 'degraded') return 'warning'
  return status === 'failed' || status === 'error' ? 'critical' : 'unknown'
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString()
}

/** 按站点监控模式加载；切换模式或卸载时取消旧请求，轮询遵循站点刷新间隔。 */
async function reload() {
  // 1. 取消旧轮询和请求，避免模式切换时旧结果覆盖当前状态。
  clearTimeout(timer)
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  const mode = isV1.value ? 'v1' : 'v2'
  try {
    // 2. 两种监控共用相同的展示模型，保持各自的成功率与时间窗口口径。
    let next: ChannelRow[]
    if (mode === 'v1') {
      const data = await channelMonitorUserAPI.list({ signal: request.signal })
      next = (data.items ?? []).map((item) => ({
        id: String(item.id),
        name: item.name || providerLabel(item.provider),
        state: probeState(item.primary_status),
        rate: Number.isFinite(item.availability_7d)
          ? item.availability_7d
          : null,
        points: paddedPoints(
          [...(item.timeline ?? [])].reverse().map((point) => ({
            state: probeState(point.status),
            time: point.checked_at
          }))
        )
      }))
    } else {
      const data = await getMatrix(
        { range: '24h', platforms: [], groupIds: [], models: [] },
        'platform',
        false,
        request.signal
      )
      next = (data.items ?? []).map((item) => ({
        id: item.platform,
        name: providerLabel(item.platform),
        state: item.metrics.request_count > 0 ? item.health.overall : 'unknown',
        rate:
          item.metrics.request_count > 0
            ? (item.metrics.success_requests / item.metrics.request_count) * 100
            : null,
        points: paddedPoints(
          [...(item.buckets ?? [])]
            .sort((a, b) => a.bucket_start.localeCompare(b.bucket_start))
            .map((bucket) => ({
              state:
                bucket.metrics.request_count > 0
                  ? bucket.health.overall
                  : 'unknown',
              time: bucket.bucket_start
            }))
        )
      }))
    }
    // 3. 只有当前请求能够更新界面；失败保留上次结果并显示过期提示。
    if (request.signal.aborted) return
    rows.value = next
    failed.value = false
  } catch (error) {
    if (request.signal.aborted) return
    failed.value = true
    console.warn('Failed to load dashboard channel status:', { mode }, error)
  } finally {
    if (!request.signal.aborted) {
      loading.value = false
      timer = setTimeout(() => {
        if (document.hidden) scheduleWhenVisible()
        else void reload()
      }, getChannelMonitorRefreshIntervalSeconds() * 1000)
    }
  }
}

/** 后台标签页只检查可见性，不发送监控请求。 */
function scheduleWhenVisible() {
  timer = setTimeout(() => {
    if (document.hidden) scheduleWhenVisible()
    else void reload()
  }, getChannelMonitorRefreshIntervalSeconds() * 1000)
}

watch(
  isV1,
  () => {
    rows.value = []
    void reload()
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
})
</script>

<style scoped>
.channel-summary {
  display: flex;
  flex-direction: column;
}
.channel-summary__overall {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.channel-summary__overall i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.channel-summary__rows {
  display: grid;
  gap: 22px;
}
.channel-summary__row-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 9px;
  font-size: 11px;
}
.channel-summary__row-heading h3 {
  min-width: 0;
  margin-right: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
}
.channel-summary__rate {
  color: var(--dashboard-muted);
  font-variant-numeric: tabular-nums;
}
.channel-summary__bars {
  display: grid;
  grid-template-columns: repeat(32, minmax(0, 1fr));
  gap: 3px;
}
.channel-summary__bar {
  height: 16px;
  border-radius: 2px;
  background: currentColor;
  transition: opacity 150ms;
}
.channel-summary__bar:hover {
  opacity: 0.6;
}
.channel-state--healthy {
  color: var(--dashboard-success);
}
.channel-state--warning {
  color: var(--dashboard-orange);
}
.channel-state--critical {
  color: #d45b70;
}
.channel-state--unknown {
  color: var(--dashboard-muted);
}
.channel-summary__bar.channel-state--unknown {
  background: var(--dashboard-line);
}
.channel-summary__empty {
  display: flex;
  flex: 1;
  min-height: 200px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--dashboard-muted);
  font-size: 12px;
  text-align: center;
}
.channel-summary__footer {
  padding-top: 24px;
  margin-top: auto;
  font-size: 11px;
}
.channel-summary__caption {
  color: var(--dashboard-muted);
  line-height: 1.6;
}
.channel-summary__axis {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: var(--dashboard-muted);
  font-size: 10px;
}
.channel-summary__details {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 20px;
}
@media (prefers-reduced-motion: reduce) {
  .channel-summary__bar {
    transition: none;
  }
}
</style>
