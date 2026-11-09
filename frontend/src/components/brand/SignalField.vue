<template>
  <!--
    SignalField：52code 标志性背景「信号等高线」。
    静态层（等高线 + 点阵 + 渐隐）绘制一次后缓存；只有 ember 光点层逐帧重绘。
    父元素需 relative；消费方可追加 class 覆盖定位与层级。绘制内核见 ./signalField.ts
  -->
  <div ref="rootEl" class="signal-field" aria-hidden="true">
    <template v-if="supported">
      <canvas ref="baseCanvas" class="signal-field__layer"></canvas>
      <canvas ref="sparkCanvas" class="signal-field__layer"></canvas>
    </template>
    <!-- 不支持 canvas 时降级为静态点阵 -->
    <div
      v-else
      class="signal-field__layer bg-dot-grid bg-dot-md dark:bg-dot-grid-dark"
      :style="{ opacity: isHero ? 0.9 : 0.55 }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  SparkSystem,
  canRefitField,
  clamp,
  createField,
  createGlowSprite,
  defaultSparkCount,
  refitField,
  renderField,
  resetLayer,
  type ContourField,
  type FieldTheme
} from './signalField'

/** SignalField 对外接口（冻结）。 */
const props = withDefaults(
  defineProps<{
    /** hero：落地页首屏，线条更密、带光点；ambient：控制台/认证页背景，极淡 */
    variant?: 'hero' | 'ambient'
    /** 是否绘制 ember 光点流动；默认 hero 开启、ambient 关闭 */
    particles?: boolean
    /** 随机种子，相同种子生成相同地形 */
    seed?: number
    /** 线条强度 0~1，覆盖 variant 默认值 */
    intensity?: number
  }>(),
  { variant: 'ambient', particles: undefined, seed: 52, intensity: undefined }
)

/** 画布像素上限，防止超高容器（长页面）申请过大的位图 */
const MAX_CANVAS_PIXELS = 6_000_000
/** 光点层帧率上限 30fps；用户在页面内键盘输入后的一段时间降到 15fps，把主线程让给表单 */
const FRAME_INTERVAL_MS = 1000 / 30
const TYPING_FRAME_INTERVAL_MS = 1000 / 15
const TYPING_IDLE_MS = 1500
const RESIZE_DEBOUNCE_MS = 150
/** 表明用户正在使用当前窗口的事件 */
const WINDOW_ACTIVE_EVENTS = ['focus', 'pointerdown', 'touchstart', 'keydown'] as const

const isHero = computed(() => props.variant === 'hero')
const particlesEnabled = computed(() => props.particles ?? isHero.value)
const strength = computed(() => clamp(props.intensity ?? (isHero.value ? 1 : 0.42), 0, 1))

const rootEl = ref<HTMLDivElement | null>(null)
const baseCanvas = ref<HTMLCanvasElement | null>(null)
const sparkCanvas = ref<HTMLCanvasElement | null>(null)
const supported = ref(true)

/** 调试 / 测试用统计信息（只读）；builds 为地形生成次数 */
const stats = { width: 0, height: 0, cell: 0, levels: 0, contours: 0, points: 0, buildMs: 0, particles: 0, builds: 0 }

// 非响应式的绘制状态，避免逐帧触发 Vue 依赖追踪
let baseCtx: CanvasRenderingContext2D | null = null
let sparkCtx: CanvasRenderingContext2D | null = null
let field: ContourField | null = null
let sparks: SparkSystem | null = null
let sprite: HTMLCanvasElement | null = null
let dpr = 1
let dark = false
let reducedMotion = false
let inView = true
/**
 * 窗口是否聚焦。由事件维护而不是每帧读 document.hasFocus()：
 * 移动端 / WebView 切回前台时 hasFocus() 可能短暂为 false 且之后不再派发 focus，逐帧读取会让循环永久停住。
 */
let windowFocused = true
/** 页面恢复可见后下一帧的复查 rAF */
let recheckId = 0
/** 最近一次键盘输入时间（performance.now） */
let lastTypingAt = -Infinity
let rafId = 0
let lastFrameTs = -1
let resizeTimer: ReturnType<typeof setTimeout> | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null
let motionQuery: MediaQueryList | null = null

function theme(): FieldTheme {
  return { dark, strength: strength.value }
}

/**
 * 明暗以组件所处容器为准：位于任意 `.dark` 祖先（含 html.dark）之内即按深色绘制，
 * 这样浅色页面里的墨色面板（如认证页右侧视觉区）也能拿到深色线色。
 * 节点尚未挂到文档时退回读取 html。
 */
function readDark(): boolean {
  const root = rootEl.value
  if (root?.isConnected) return root.closest('.dark') !== null
  return document.documentElement.classList.contains('dark')
}

/** 设备像素比：上限 2，并按画布面积收紧，防止超大位图 */
function resolveDpr(w: number, h: number): number {
  return clamp(Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / (w * h))), 0.5, 2)
}

function ensureContexts(): boolean {
  if (baseCtx) return true
  if (!baseCanvas.value || !sparkCanvas.value) return false
  try {
    baseCtx = baseCanvas.value.getContext('2d') ?? null
    sparkCtx = sparkCanvas.value.getContext('2d') ?? null
  } catch {
    baseCtx = null
  }
  if (!baseCtx) {
    // 无 canvas 能力时降级为静态点阵
    supported.value = false
    stop()
    return false
  }
  return true
}

function sizeCanvas(el: HTMLCanvasElement | null, w: number, h: number): void {
  if (!el) return
  const pw = Math.max(1, Math.round(w * dpr))
  const ph = Math.max(1, Math.round(h * dpr))
  if (el.width !== pw) el.width = pw
  if (el.height !== ph) el.height = ph
}

/** 绘制光点层；full 为 true 时整幅清空（画布尺寸 / 主题变化后），否则只擦除上一帧的脏矩形 */
function drawSparks(full = false): void {
  if (!sparkCtx || !field) return
  if (sparks) sparks.draw(sparkCtx, theme(), dpr, sprite, full)
  else resetLayer(sparkCtx, field.width, field.height, dpr)
}

// ==================== 动画循环 ====================

function shouldAnimate(): boolean {
  return (
    !!sparks &&
    sparks.size > 0 &&
    !!sparkCtx &&
    !reducedMotion &&
    inView &&
    !document.hidden &&
    // 窗口失焦（切到其他应用 / 地址栏）时暂停
    windowFocused &&
    typeof window.requestAnimationFrame === 'function'
  )
}

function frame(ts: number): void {
  if (!shouldAnimate()) {
    rafId = 0
    return
  }
  rafId = window.requestAnimationFrame(frame)
  if (lastFrameTs < 0) {
    lastFrameTs = ts
    drawSparks()
    return
  }
  const elapsed = ts - lastFrameTs
  const typing = performance.now() - lastTypingAt < TYPING_IDLE_MS
  if (elapsed < (typing ? TYPING_FRAME_INTERVAL_MS : FRAME_INTERVAL_MS) - 2) return
  lastFrameTs = ts
  // 恢复或掉帧时限制步长，避免光点跳跃
  sparks?.step(Math.min(elapsed, 100) / 1000)
  drawSparks()
}

function start(): void {
  if (rafId) return
  lastFrameTs = -1
  rafId = window.requestAnimationFrame(frame)
}

function stop(): void {
  if (rafId && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(rafId)
  rafId = 0
}

/** 根据可见性 / 动效偏好启停循环；暂停时保留最后一帧 */
function syncLoop(): void {
  if (shouldAnimate()) {
    start()
    return
  }
  stop()
  if (reducedMotion) drawSparks()
}

function onTyping(): void {
  lastTypingAt = performance.now()
}

function onWindowBlur(): void {
  windowFocused = false
  syncLoop()
}

/** focus / pointerdown / touchstart / keydown：确认窗口处于活动状态 */
function onWindowActive(): void {
  if (windowFocused) return
  windowFocused = true
  syncLoop()
}

/** visibilitychange / pageshow：页面变为可见时乐观视为聚焦，并在下一帧复查一次 */
function onPageVisibility(): void {
  if (!document.hidden) windowFocused = true
  syncLoop()
  if (document.hidden || recheckId || typeof window.requestAnimationFrame !== 'function') return
  recheckId = window.requestAnimationFrame(() => {
    recheckId = 0
    syncLoop()
  })
}

// ==================== 构建与生命周期 ====================

function rebuild(force: boolean): void {
  if (!rootEl.value) return
  const rect = rootEl.value.getBoundingClientRect()
  const w = Math.round(rect.width)
  const h = Math.round(rect.height)
  // 尺寸为 0（隐藏 / 测试环境）时不申请 canvas 上下文
  if (w < 2 || h < 2) return
  const nextDpr = resolveDpr(w, h)
  if (!force && field && w === field.width && h === field.height && nextDpr === dpr) return
  if (!ensureContexts() || !baseCtx) return

  dpr = nextDpr
  sizeCanvas(baseCanvas.value, w, h)
  sizeCanvas(sparkCanvas.value, w, h)

  // 宽度不变、仅高度小幅变化（移动端地址栏收起 / 展开）：复用地形，只按新尺寸重绘，避免形状跳变
  if (!force && field && canRefitField(field, w, h)) {
    refitField(field, h)
    renderField(baseCtx, field, theme(), dpr)
    sprite = createGlowSprite(dpr, dark)
    drawSparks(true)
    stats.height = h
    syncLoop()
    return
  }

  const t0 = performance.now()
  field = createField(w, h, isHero.value, props.seed)
  stats.buildMs = Math.round((performance.now() - t0) * 100) / 100
  stats.builds += 1

  renderField(baseCtx, field, theme(), dpr)
  sprite = createGlowSprite(dpr, dark)
  sparks = particlesEnabled.value ? new SparkSystem(field, defaultSparkCount(field), props.seed, reducedMotion) : null
  drawSparks()

  Object.assign(stats, {
    width: w,
    height: h,
    cell: field.cell,
    levels: field.levels,
    contours: field.contours.length,
    points: field.contours.reduce((sum, c) => sum + c.pts.length / 2, 0),
    particles: sparks?.size ?? 0
  })
  syncLoop()
}

function scheduleResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    resizeTimer = null
    rebuild(false)
  }, RESIZE_DEBOUNCE_MS)
}

function onThemeMutation(): void {
  const next = readDark()
  if (next === dark) return
  dark = next
  if (baseCtx && field) renderField(baseCtx, field, theme(), dpr)
  sprite = createGlowSprite(dpr, dark)
  drawSparks(true)
}

function onMotionChange(event: MediaQueryListEvent): void {
  reducedMotion = event.matches
  if (reducedMotion) sparks?.settle()
  syncLoop()
}

onMounted(() => {
  dark = readDark()
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    motionQuery = mq
    reducedMotion = mq.matches
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMotionChange)
    else if (typeof mq.addListener === 'function') mq.addListener(onMotionChange)
  }

  rebuild(true)

  const root = rootEl.value
  if (root && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleResize)
    resizeObserver.observe(root)
  }
  if (root && typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1]
        if (!entry) return
        inView = entry.isIntersecting
        syncLoop()
      },
      { rootMargin: '64px' }
    )
    intersectionObserver.observe(root)
  }
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(onThemeMutation)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }
  document.addEventListener('visibilitychange', onPageVisibility)
  window.addEventListener('pageshow', onPageVisibility)
  window.addEventListener('blur', onWindowBlur)
  for (const type of WINDOW_ACTIVE_EVENTS) window.addEventListener(type, onWindowActive, { capture: true, passive: true })
  document.addEventListener('keydown', onTyping, { capture: true, passive: true })
  document.addEventListener('input', onTyping, { capture: true, passive: true })
})

onBeforeUnmount(() => {
  stop()
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  if (recheckId && typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(recheckId)
  recheckId = 0
  document.removeEventListener('visibilitychange', onPageVisibility)
  window.removeEventListener('pageshow', onPageVisibility)
  window.removeEventListener('blur', onWindowBlur)
  for (const type of WINDOW_ACTIVE_EVENTS) window.removeEventListener(type, onWindowActive, { capture: true })
  document.removeEventListener('keydown', onTyping, { capture: true })
  document.removeEventListener('input', onTyping, { capture: true })
  const mq = motionQuery
  if (mq && typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onMotionChange)
  else if (mq && typeof mq.removeListener === 'function') mq.removeListener(onMotionChange)
  resizeTimer = null
  resizeObserver = null
  intersectionObserver = null
  themeObserver = null
  motionQuery = null
  baseCtx = null
  sparkCtx = null
  field = null
  sparks = null
  sprite = null
})

watch(
  () => [props.variant, props.particles, props.seed, props.intensity],
  () => rebuild(true)
)

defineExpose({ stats })
</script>

<style>
/* 零特异性：消费方的定位 / 层级工具类（fixed、-z-10、opacity-* 等）可直接覆盖 */
:where(.signal-field) {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
}

:where(.signal-field__layer) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
