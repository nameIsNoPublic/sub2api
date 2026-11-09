<template>
  <div
    ref="rootRef"
    :class="{ 'route-map--paused': !inView }"
    class="overflow-hidden rounded-2xl border border-gray-200/90 bg-white/85 shadow-[0_1px_0_rgba(23,24,28,0.03),0_24px_60px_-32px_rgba(23,24,28,0.25)] backdrop-blur dark:border-dark-800 dark:bg-dark-900/85 dark:shadow-none"
  >
    <!-- 标题栏：明确标注「示意」，不展示任何运营数字 -->
    <div
      class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200/80 px-4 py-3 sm:px-5 dark:border-dark-800"
    >
      <span class="signal-dot" aria-hidden="true"></span>
      <h2 class="text-sm font-semibold tracking-tight text-gray-950 dark:text-white">
        {{ t('ui52.home.routing.title') }}
      </h2>
      <span class="badge badge-ember font-mono text-[10.5px]">{{ t('ui52.home.routing.demoBadge') }}</span>
      <div class="ml-auto hidden flex-wrap items-center gap-1.5 sm:flex">
        <span v-for="chip in chips" :key="chip" class="chip">{{ chip }}</span>
      </div>
    </div>

    <!-- 桌面：拓扑图（SVG 连线 + 百分比定位节点，同宽高比保证对齐） -->
    <div
      class="relative hidden bg-dot-grid bg-dot-sm px-3 py-2 md:block dark:bg-dot-grid-dark"
      role="img"
      :aria-label="t('ui52.home.routing.ariaLabel')"
    >
      <div class="relative mx-auto max-w-[1080px]" :style="{ aspectRatio: `${ROUTE_VIEWBOX.width} / ${ROUTE_VIEWBOX.height}` }">
        <svg
          ref="svgRef"
          :viewBox="`0 0 ${ROUTE_VIEWBOX.width} ${ROUTE_VIEWBOX.height}`"
          class="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
          focusable="false"
        >
          <path
            v-for="(path, index) in inPaths"
            :key="`in-${index}`"
            :d="path"
            class="route-line"
            :class="{ 'route-line--active': current.client === index }"
          />
          <path
            v-for="(path, index) in outPaths"
            :key="`out-${index}`"
            :d="path"
            class="route-line"
            :class="{
              'route-line--active': current.upstream === index && current.status === 200,
              'route-line--warn': current.upstream === index && current.status === 429
            }"
          />

          <!-- 环境光点：沿每条线缓慢流动 -->
          <g v-if="animated" class="route-ambient">
            <circle v-for="(path, index) in allPaths" :key="`amb-${index}`" r="2.4">
              <animateMotion
                :dur="`${3.6 + (index % 3) * 0.5}s`"
                :begin="`${(index * 0.45).toFixed(2)}s`"
                repeatCount="indefinite"
                :path="path"
              />
            </circle>
          </g>

          <!-- 当前请求数据包：先入网关，再出上游 -->
          <g v-if="animated">
            <circle r="4.5" class="route-packet" opacity="0">
              <animateMotion ref="packetInMotion" dur="0.8s" begin="indefinite" fill="freeze" :path="inPaths[current.client]" />
              <animate ref="packetInFade" attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="0.8s" begin="indefinite" fill="freeze" />
            </circle>
            <circle r="4.5" :class="current.status === 429 ? 'route-packet route-packet--warn' : 'route-packet'" opacity="0">
              <animateMotion ref="packetOutMotion" dur="0.8s" begin="indefinite" fill="freeze" :path="outPaths[current.upstream]" />
              <animate ref="packetOutFade" attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="0.8s" begin="indefinite" fill="freeze" />
            </circle>
          </g>
        </svg>

        <!-- 客户端节点 -->
        <div
          v-for="(client, index) in ROUTE_CLIENTS"
          :key="client.name"
          class="route-node absolute"
          :class="{ 'route-node--active': current.client === index }"
          :style="nodeStyle(2, ROUTE_X.clientEdge / 10 - 2, ROUTE_ROWS[index])"
        >
          <div class="truncate font-mono text-[12.5px] font-medium text-gray-950 dark:text-white">{{ client.name }}</div>
          <div class="truncate font-mono text-[10px] text-gray-500 dark:text-dark-400">{{ client.endpoint }}</div>
        </div>

        <!-- 中枢 -->
        <div
          class="absolute flex flex-col items-center justify-center text-center"
          :style="nodeStyle(ROUTE_X.hubIn / 10, (ROUTE_X.hubOut - ROUTE_X.hubIn) / 10, ROUTE_HUB_Y)"
        >
          <div class="route-hub relative w-full rounded-2xl border border-primary-200 bg-white px-3 py-4 dark:border-primary-400/30 dark:bg-dark-900">
            <span class="route-hub__halo" aria-hidden="true"></span>
            <div class="flex justify-center">
              <BrandMark size="md" :show-name="false" />
            </div>
            <div class="mt-2 truncate font-mono text-[12px] font-semibold text-gray-950 dark:text-white">{{ hubName }}</div>
            <div class="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[0.1em] text-primary-600/80 dark:text-primary-300/80">
              {{ t('ui52.home.routing.hubCaption') }}
            </div>
          </div>
        </div>

        <!-- 上游节点 -->
        <div
          v-for="(upstream, index) in ROUTE_UPSTREAMS"
          :key="upstream.name"
          class="route-node absolute"
          :class="{
            'route-node--active': current.upstream === index && current.status === 200,
            'route-node--warn': current.upstream === index && current.status === 429
          }"
          :style="nodeStyle(ROUTE_X.upstreamEdge / 10, 100 - ROUTE_X.upstreamEdge / 10 - 2, ROUTE_ROWS[index])"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="truncate font-mono text-[12.5px] font-medium text-gray-950 dark:text-white">{{ upstream.name }}</span>
          </div>
          <div class="mt-1 flex items-center gap-2">
            <span class="hidden shrink-0 font-mono text-[9.5px] text-gray-500 lg:inline dark:text-dark-400">{{ t('ui52.home.routing.pool') }}</span>
            <span class="flex min-w-0 flex-1 justify-end gap-[3px] overflow-hidden" aria-hidden="true">
              <i
                v-for="slot in upstream.pool"
                :key="slot"
                class="block h-[7px] w-[7px] rounded-[2px]"
                :class="poolSlotClass(index, slot)"
              ></i>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端：纵向简化 -->
    <div class="grid gap-3 bg-dot-grid bg-dot-sm p-4 md:hidden dark:bg-dot-grid-dark" role="img" :aria-label="t('ui52.home.routing.ariaLabel')">
      <div>
        <p class="kicker mb-2 text-[10px]">{{ t('ui52.home.routing.clientsLabel') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(client, index) in ROUTE_CLIENTS"
            :key="client.name"
            class="chip transition-colors"
            :class="current.client === index ? 'border-ember-300 text-ember-700 dark:border-ember-500/50 dark:text-ember-300' : ''"
          >{{ client.name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-3 rounded-xl border border-primary-200 bg-white px-3 py-2.5 shadow-glow dark:border-primary-400/30 dark:bg-dark-900">
        <BrandMark size="sm" :show-name="false" />
        <div class="min-w-0">
          <div class="truncate font-mono text-xs font-semibold text-gray-950 dark:text-white">{{ hubName }}</div>
          <div class="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500 dark:text-dark-400">{{ t('ui52.home.routing.hubCaption') }}</div>
        </div>
        <Icon name="arrowDown" size="xs" class="ml-auto text-gray-500 dark:text-dark-400" />
      </div>
      <div>
        <p class="kicker mb-2 text-[10px]">{{ t('ui52.home.routing.upstreamsLabel') }}</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="(upstream, index) in ROUTE_UPSTREAMS"
            :key="upstream.name"
            class="chip transition-colors"
            :class="current.upstream === index ? (current.status === 429 ? 'border-amber-300 text-amber-700 dark:border-amber-500/50 dark:text-amber-300' : 'border-ember-300 text-ember-700 dark:border-ember-500/50 dark:text-ember-300') : ''"
          >{{ upstream.name }}</span>
        </div>
      </div>
    </div>

    <!-- 示意请求流水 -->
    <div class="border-t border-gray-200/80 dark:border-dark-800">
      <table class="w-full table-fixed font-mono text-[11.5px]">
        <caption class="sr-only">{{ t('ui52.home.routing.logLabel') }}</caption>
        <TransitionGroup tag="tbody" name="route-log">
          <tr
            v-for="(row, rowIndex) in log"
            :key="row.id"
            class="border-b border-gray-100 transition-opacity duration-300 last:border-b-0 dark:border-dark-800/70"
            :class="rowIndex === 0 ? 'bg-ember-50/60 opacity-100 dark:bg-ember-500/[0.06]' : 'opacity-[0.85]'"
          >
            <td class="w-[78px] py-1.5 pl-4 text-gray-500 sm:w-[96px] sm:pl-5 dark:text-dark-300">{{ row.time }}</td>
            <td class="hidden w-[52px] py-1.5 text-gray-600 sm:table-cell dark:text-dark-300">{{ row.method }}</td>
            <td class="hidden truncate py-1.5 pr-3 text-gray-700 sm:table-cell dark:text-dark-200">{{ row.path }}</td>
            <td class="truncate py-1.5 pr-3 text-gray-950 dark:text-white">{{ row.model }}</td>
            <td class="w-[64px] py-1.5 sm:w-[168px]">
              <span v-if="row.status === 429" class="text-amber-600 dark:text-amber-400">429<span class="hidden text-gray-500 sm:inline dark:text-dark-300"> rate_limited</span></span>
              <span v-else class="text-emerald-600 dark:text-emerald-400">
                <span v-if="row.retry" class="text-gray-500 dark:text-dark-300">↳ </span>200<span
                  v-if="row.retry"
                  class="hidden text-gray-500 sm:inline dark:text-dark-300"
                > {{ t('ui52.home.routing.retried') }}</span>
              </span>
            </td>
            <td class="w-[76px] py-1.5 pr-4 text-right text-gray-800 sm:w-[88px] sm:pr-5 dark:text-dark-100">{{ formatDemoCost(row.cost) }}</td>
          </tr>
        </TransitionGroup>
      </table>
      <p class="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-500 sm:px-5 dark:border-dark-800/70 dark:text-dark-400">
        {{ t('ui52.home.routing.demoNote') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 路由示意图（Demo）：客户端 → 网关中枢 → 上游，配合循环播放的示意请求流水。
 * 所有数据均为静态示意（见 homeContent.ts），界面已标注「示意」，不代表实时流量。
 * 仅在进入视口且未开启「减少动态效果」时播放动画：离屏时停掉定时器、
 * 暂停 SVG SMIL 光点与 CSS 虚线动画；系统动态效果偏好变化时实时响应。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BrandMark from '@/components/brand/BrandMark.vue'
import Icon from '@/components/icons/Icon.vue'
import {
  DEMO_REQUESTS,
  ROUTE_CLIENTS,
  ROUTE_HUB_Y,
  ROUTE_ROWS,
  ROUTE_UPSTREAMS,
  ROUTE_VIEWBOX,
  ROUTE_X,
  curvePath,
  formatDemoCost,
  type DemoRequest
} from './homeContent'

defineProps<{
  /** 中枢显示名（默认品牌为域名） */
  hubName: string
}>()

const { t } = useI18n()

interface LogRow extends DemoRequest {
  id: number
  time: string
}

const LOG_SIZE = 6
const TICK_MS = 1900

const rootRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const packetInMotion = ref<SVGAnimationElement | null>(null)
const packetInFade = ref<SVGAnimationElement | null>(null)
const packetOutMotion = ref<SVGAnimationElement | null>(null)
const packetOutFade = ref<SVGAnimationElement | null>(null)

const reducedMotion = ref(false)
/** 是否在视口内；不支持 IntersectionObserver 时视为始终可见 */
const inView = ref(true)
const cursor = ref(0)
const log = ref<LogRow[]>([])
let rowSeq = 0
let timer: ReturnType<typeof setInterval> | null = null
let observer: IntersectionObserver | null = null
let motionQuery: MediaQueryList | null = null

const animated = computed(() => !reducedMotion.value)
const current = computed<DemoRequest>(() => DEMO_REQUESTS[cursor.value])

const chips = computed(() => [
  t('ui52.home.routing.chips.stream'),
  t('ui52.home.routing.chips.retry'),
  t('ui52.home.routing.chips.billing')
])

const inPaths = ROUTE_ROWS.map((y) => curvePath(ROUTE_X.clientEdge, y, ROUTE_X.hubIn, ROUTE_HUB_Y))
const outPaths = ROUTE_ROWS.map((y) => curvePath(ROUTE_X.hubOut, ROUTE_HUB_Y, ROUTE_X.upstreamEdge, y))
const allPaths = [...inPaths, ...outPaths]

/** 把 viewBox 坐标换算成百分比定位：left/width 为百分比，centerY 为 viewBox 纵坐标。 */
function nodeStyle(leftPct: number, widthPct: number, centerY: number) {
  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    top: `${(centerY / ROUTE_VIEWBOX.height) * 100}%`,
    transform: 'translateY(-50%)'
  }
}

/** 账号池示意格：当前上游在 429 时把第 3 格标为冷却中。 */
function poolSlotClass(upstreamIndex: number, slot: number): string {
  const isCurrent = current.value.upstream === upstreamIndex
  if (isCurrent && current.value.status === 429 && slot === 3) return 'bg-amber-400 dark:bg-amber-400'
  if (isCurrent && slot === 4) return 'bg-ember-500'
  return 'bg-emerald-500/70 dark:bg-emerald-400/60'
}

function formatClock(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function makeRow(request: DemoRequest, at: Date): LogRow {
  rowSeq += 1
  return { ...request, id: rowSeq, time: formatClock(at) }
}

/** 预填几条历史行（最新一条即当前高亮请求），避免首屏流水为空。 */
function seedLog() {
  const now = Date.now()
  const total = DEMO_REQUESTS.length
  const rows: LogRow[] = []
  for (let offset = 0; offset < LOG_SIZE; offset += 1) {
    const index = (cursor.value - offset + total * LOG_SIZE) % total
    rows.push(makeRow(DEMO_REQUESTS[index], new Date(now - offset * TICK_MS)))
  }
  log.value = rows
}

function playPacket() {
  const begin = (el: SVGAnimationElement | null, delay = 0) => {
    if (el && typeof el.beginElementAt === 'function') el.beginElementAt(delay)
  }
  begin(packetInMotion.value)
  begin(packetInFade.value)
  begin(packetOutMotion.value, 0.75)
  begin(packetOutFade.value, 0.75)
}

function advance() {
  cursor.value = (cursor.value + 1) % DEMO_REQUESTS.length
  log.value = [makeRow(DEMO_REQUESTS[cursor.value], new Date()), ...log.value].slice(0, LOG_SIZE)
  if (animated.value) void nextTick(playPacket)
}

function start() {
  if (timer || reducedMotion.value || !inView.value) return
  timer = setInterval(advance, TICK_MS)
}

function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** 同步播放状态：定时器 + SVG SMIL 时间线（CSS 动画由 route-map--paused 类暂停）。 */
function syncPlayback() {
  const svg = svgRef.value
  if (inView.value && !reducedMotion.value) {
    start()
    if (svg && typeof svg.unpauseAnimations === 'function') svg.unpauseAnimations()
  } else {
    stop()
    if (svg && typeof svg.pauseAnimations === 'function') svg.pauseAnimations()
  }
}

function onMotionPreferenceChange(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches
}

watch([inView, reducedMotion], () => {
  void nextTick(syncPlayback)
})

onMounted(() => {
  if (typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = motionQuery?.matches === true
    if (motionQuery && typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', onMotionPreferenceChange)
    }
  }
  seedLog()

  if (typeof IntersectionObserver === 'function' && rootRef.value) {
    observer = new IntersectionObserver(
      (entries) => {
        inView.value = entries.some((entry) => entry.isIntersecting)
      },
      { threshold: 0.15 }
    )
    observer.observe(rootRef.value)
  }
  syncPlayback()
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  observer = null
  if (motionQuery && typeof motionQuery.removeEventListener === 'function') {
    motionQuery.removeEventListener('change', onMotionPreferenceChange)
  }
  motionQuery = null
})
</script>

<style scoped>
.route-line {
  fill: none;
  stroke: rgb(114 98 241 / 0.35);
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
  transition: stroke 240ms ease, stroke-width 240ms ease;
}

.dark .route-line {
  stroke: rgb(150 136 248 / 0.35);
}

.route-line--active {
  stroke: rgb(242 113 28 / 0.85);
  stroke-width: 1.75;
  stroke-dasharray: 5 6;
  animation: route-dash 0.9s linear infinite;
}

.dark .route-line--active {
  stroke: rgb(251 139 60 / 0.9);
}

.route-line--warn {
  stroke: rgb(245 158 11 / 0.9);
  stroke-width: 1.75;
  stroke-dasharray: 2 5;
}

.dark .route-line--warn {
  stroke: rgb(251 191 36 / 0.85);
}

.route-ambient circle {
  fill: rgb(242 113 28 / 0.6);
}

.dark .route-ambient circle {
  fill: rgb(251 139 60 / 0.65);
}

.route-packet {
  fill: rgb(242 113 28);
  filter: drop-shadow(0 0 4px rgb(242 113 28 / 0.7));
}

.route-packet--warn {
  fill: rgb(245 158 11);
  filter: drop-shadow(0 0 4px rgb(245 158 11 / 0.7));
}

.route-node {
  @apply rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-[0_1px_0_rgba(23,24,28,0.04)];
  @apply transition-[border-color,box-shadow] duration-200;
  @apply dark:border-dark-700 dark:bg-dark-900;
}

.route-node--active {
  @apply border-ember-300 shadow-ember dark:border-ember-500/60;
}

.route-node--warn {
  @apply border-amber-300 dark:border-amber-500/60;
  box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.14);
}

.route-hub {
  box-shadow:
    0 0 0 6px rgba(114, 98, 241, 0.1),
    0 0 36px -6px rgba(114, 98, 241, 0.32),
    0 18px 40px -20px rgba(91, 71, 230, 0.5);
}

.dark .route-hub {
  box-shadow:
    0 0 0 6px rgba(150, 136, 248, 0.12),
    0 0 36px -6px rgba(150, 136, 248, 0.26),
    0 18px 40px -20px rgba(0, 0, 0, 0.6);
}

.route-hub__halo {
  position: absolute;
  inset: -18px;
  z-index: -1;
  border-radius: 28px;
  background: radial-gradient(closest-side, rgba(114, 98, 241, 0.22), transparent);
  pointer-events: none;
}

@keyframes route-dash {
  to {
    stroke-dashoffset: -22;
  }
}

.route-log-enter-active {
  transition: opacity 360ms ease, transform 360ms ease;
}

.route-log-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.route-log-leave-active {
  display: none;
}

/* 离屏时暂停虚线流动 */
.route-map--paused .route-line--active {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .route-line--active {
    animation: none;
  }

  .route-log-enter-active {
    transition: none;
  }
}
</style>
