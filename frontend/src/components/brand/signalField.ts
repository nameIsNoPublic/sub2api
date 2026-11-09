/**
 * SignalField 绘制内核（与 Vue 无关，便于测试与复用）。
 * - 地形：mulberry32 种子 → simplex 噪声（3 层分形 + 轻度域扭曲）；hero 在右半屏叠加高斯「峰」形成同心环
 * - 等值线：marching squares（鞍点按中心均值消歧）→ 按边 id 串联成折线 → 二次曲线中点平滑
 * - 渐隐：destination-in 叠乘水平 / 垂直两条渐变；同一组断点在 JS 中求值供光点使用，二者一致
 * - 光点：ember 光点沿等高线缓慢游走，短尾迹 + 柔光 + 偶发淡出的光痕
 */

// ==================== 类型 ====================

export interface Contour {
  /** 等值层序号（0 = 最低层） */
  level: number
  /** 折线坐标 [x0, y0, x1, y1, ...]（CSS 像素）；闭合曲线末点与首点重合 */
  pts: Float32Array
  /** 累积弧长：cum[i] 为第 i 个点处的路径长度 */
  cum: Float32Array
  length: number
  closed: boolean
}

/** 渐变断点：[位置 0~1, 不透明度 0~1] */
export type Stops = ReadonlyArray<readonly [number, number]>

export interface MaskStops {
  x: Stops
  y: Stops
}

export interface ContourField {
  width: number
  /** 当前视口高度；小幅变化时原地更新（见 refitField），地形不重建 */
  height: number
  /** 已生成地形的高度范围（视口高度 + 余量） */
  extent: number
  hero: boolean
  /** 采样网格步长（px） */
  cell: number
  /** 等值层数量 */
  levels: number
  contours: Contour[]
  mask: MaskStops
}

export interface FieldTheme {
  dark: boolean
  /** 线条强度 0~1 */
  strength: number
}

interface Point {
  x: number
  y: number
}

/** 光点层脏矩形（CSS 像素） */
interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface Spark {
  /** 所在等高线下标 */
  c: number
  /** 沿线位置（像素弧长） */
  s: number
  dir: 1 | -1
  /** 速度（px/s） */
  speed: number
  /** 尾迹长度（px） */
  trail: number
  /** 淡入进度，负值表示错峰延迟出现 */
  fade: number
  /** 剩余寿命（秒），到期后换一条线重新出现 */
  ttl: number
  /** 距下一次留下光痕的时间（秒） */
  glintIn: number
}

interface Glint {
  c: number
  from: number
  to: number
  age: number
  life: number
}

interface RGBA {
  rgb: readonly [number, number, number]
  a: number
}

// ==================== 常量 ====================

const TAU = Math.PI * 2
export const GLOW_RADIUS = 10
const TRAIL_STEPS = 6
const FADE_IN_SECONDS = 1.4
const FADE_OUT_SECONDS = 1.2
const MAX_GLINTS = 8
/** 光点出生时与其他光点的最小间距（px） */
const MIN_SPARK_GAP = 140
/** 脏矩形外扩（px），覆盖抗锯齿边缘 */
const DIRTY_PAD = 2
/** 高度小幅变化阈值：移动端地址栏收起 / 展开通常落在此范围内，不重建地形 */
const REFIT_HEIGHT_DELTA = 160
const REFIT_HEIGHT_RATIO = 0.2

// 线色：浅色模式墨色 ↔ 靛蓝，深色模式白 ↔ 浅靛蓝；越高的等值层越靠近靛蓝
const LIGHT_LOW: RGBA = { rgb: [23, 24, 28], a: 0.07 }
const LIGHT_HIGH: RGBA = { rgb: [91, 71, 230], a: 0.16 }
const DARK_LOW: RGBA = { rgb: [255, 255, 255], a: 0.055 }
const DARK_HIGH: RGBA = { rgb: [150, 136, 248], a: 0.13 }

const EMBER = { light: '242, 113, 28', dark: '251, 139, 60' } as const
const EMBER_CORE = { light: '#f2711c', dark: '#fdb174' } as const

// simplex 噪声梯度（8 方向）
const GRAD_X = [1, -1, 1, -1, 1, -1, 0, 0]
const GRAD_Y = [1, 1, -1, -1, 0, 0, 1, -1]
const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

// ==================== 基础工具 ====================

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** mulberry32：小而快的种子伪随机数发生器 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 2D simplex 噪声（Gustavson 实现），返回值约在 [-1, 1] */
function createSimplex(random: () => number): (x: number, y: number) => number {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = p[i]
    p[i] = p[j]
    p[j] = tmp
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  // 单个单纯形角点的贡献
  const corner = (g: number, x: number, y: number): number => {
    let t = 0.5 - x * x - y * y
    if (t <= 0) return 0
    t *= t
    return t * t * (GRAD_X[g] * x + GRAD_Y[g] * y)
  }

  return (xin: number, yin: number): number => {
    const s = (xin + yin) * F2
    const i = Math.floor(xin + s)
    const j = Math.floor(yin + s)
    const t = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const i1 = x0 > y0 ? 1 : 0
    const j1 = 1 - i1
    const ii = i & 255
    const jj = j & 255
    return (
      70 *
      (corner(perm[ii + perm[jj]] & 7, x0, y0) +
        corner(perm[ii + i1 + perm[jj + j1]] & 7, x0 - i1 + G2, y0 - j1 + G2) +
        corner(perm[ii + 1 + perm[jj + 1]] & 7, x0 - 1 + 2 * G2, y0 - 1 + 2 * G2))
    )
  }
}

/** 分段线性求值渐变断点 */
function sampleStops(stops: Stops, t: number): number {
  if (t <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [p1, v1] = stops[i]
    if (t <= p1) {
      const [p0, v0] = stops[i - 1]
      return lerp(v0, v1, p1 > p0 ? (t - p0) / (p1 - p0) : 1)
    }
  }
  return stops[stops.length - 1][1]
}

/**
 * 渐隐蒙版断点。
 * hero：左侧标题区最淡、右侧清晰，顶部轻收、底部完全淡出；窄屏内容通栏，整体更平。
 * ambient：几乎均匀，仅左缘与底缘轻收。
 */
function resolveMask(hero: boolean, w: number): MaskStops {
  if (!hero) {
    return { x: [[0, 0.7], [0.45, 1], [1, 1]], y: [[0, 1], [0.8, 1], [1, 0.55]] }
  }
  if (w < 768) {
    return { x: [[0, 0.32], [0.6, 0.6], [1, 0.9]], y: [[0, 0.45], [0.2, 0.8], [0.75, 0.75], [1, 0]] }
  }
  return {
    x: [[0, 0.14], [0.32, 0.28], [0.56, 0.85], [0.7, 1], [1, 1]],
    y: [[0, 0.5], [0.1, 1], [0.78, 1], [1, 0]]
  }
}

/** 蒙版在 (x, y) 处的不透明度 */
export function fieldMaskAt(field: ContourField, x: number, y: number): number {
  return sampleStops(field.mask.x, x / field.width) * sampleStops(field.mask.y, y / field.height)
}

/** 读取曲线上弧长 s 处的坐标写入 out；闭合曲线取模，开放曲线夹紧 */
export function pointAt(c: Contour, s: number, out: Point): void {
  const len = c.length
  let d = c.closed ? s % len : clamp(s, 0, len)
  if (d < 0) d += len
  const cum = c.cum
  let lo = 0
  let hi = cum.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cum[mid] <= d) lo = mid
    else hi = mid
  }
  const segLen = cum[hi] - cum[lo]
  const t = segLen > 0 ? (d - cum[lo]) / segLen : 0
  const p = c.pts
  out.x = p[lo * 2] + (p[hi * 2] - p[lo * 2]) * t
  out.y = p[lo * 2 + 1] + (p[hi * 2 + 1] - p[lo * 2 + 1]) * t
}

// ==================== 地形与等高线 ====================

/** 采样高度场；网格比画布外扩一圈，开放曲线的端点落在画布外，线条自然延伸出边缘 */
function sampleHeights(
  w: number,
  h: number,
  hero: boolean,
  seed: number,
  cell: number,
  cols: number,
  rows: number
): { vals: Float32Array; min: number; max: number } {
  const rand = mulberry32(seed)
  const noise = createSimplex(rand)
  const scale = hero ? 1 / 430 : 1 / 560
  const ox = rand() * 256
  const oy = rand() * 256
  // hero 的峰固定在右半屏（种子只做小幅抖动）；ambient 的峰随机且更平缓
  const peakX = w * (hero ? 0.72 + (rand() - 0.5) * 0.08 : 0.3 + rand() * 0.5)
  const peakY = h * (hero ? 0.36 + (rand() - 0.5) * 0.1 : 0.25 + rand() * 0.5)
  const peakRx = Math.max(w * (hero ? 0.2 : 0.26), 220)
  const peakRy = Math.max(h * (hero ? 0.3 : 0.34), 190)
  const peakAmp = hero ? 1.05 : 0.5

  const vals = new Float32Array(cols * rows)
  let min = Infinity
  let max = -Infinity
  for (let j = 0; j < rows; j++) {
    const py = (j - 1) * cell
    for (let i = 0; i < cols; i++) {
      const px = (i - 1) * cell
      const nx = px * scale + ox
      const ny = py * scale + oy
      // 轻度域扭曲，让等高线更像自然地形而不是规整噪声
      const fx = nx + noise(nx * 0.7 + 17.3, ny * 0.7 + 3.1) * 0.32
      const fy = ny + noise(nx * 0.7 - 9.7, ny * 0.7 + 21.4) * 0.32
      // 3 层分形、快速衰减：高频成分少，线条圆润不起毛刺
      const n = (noise(fx, fy) + 0.42 * noise(fx * 2.03, fy * 2.03) + 0.14 * noise(fx * 4.01, fy * 4.01)) / 1.56
      const dx = (px - peakX) / peakRx
      const dy = (py - peakY) / peakRy
      const bump = Math.exp(-(dx * dx + dy * dy))
      // 峰附近压低噪声，等高线收拢成清晰的同心环
      const v = n * (1 - 0.45 * bump) + peakAmp * bump
      vals[j * cols + i] = v
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  return { vals, min, max }
}

/**
 * marching squares 每种角点组合对应的线段（以单元四条边编号：0 上 1 右 2 下 3 左）。
 * 鞍点（5、10）单独按中心均值处理。
 */
const CASE_SEGMENTS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [], [[0, 2]], [[3, 0]],
  [[3, 0]], [[0, 2]], [], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []
]

/** 提取 levels 个等值层的折线 */
function extractContours(
  vals: Float32Array,
  min: number,
  max: number,
  cell: number,
  cols: number,
  rows: number,
  levels: number
): Contour[] {
  // 边 id：水平边 (i,j)-(i+1,j) = p*2，垂直边 (i,j)-(i,j+1) = p*2+1，p = j*cols+i
  const slots = cols * rows * 2
  const adjA = new Int32Array(slots).fill(-1)
  const adjB = new Int32Array(slots).fill(-1)
  const mark = new Uint16Array(slots)
  const touched = new Int32Array(slots)
  const edges = [0, 0, 0, 0]
  const minStep = cell * 0.3
  const minLength = cell * 3
  const contours: Contour[] = []

  for (let k = 0; k < levels; k++) {
    const level = min + ((max - min) * (k + 1)) / (levels + 1)
    const stamp = k + 1
    let nTouched = 0

    const link = (a: number, b: number): void => {
      if (adjA[a] === -1) {
        adjA[a] = b
        touched[nTouched++] = a
      } else {
        adjB[a] = b
      }
    }
    const seg = (a: number, b: number): void => {
      link(a, b)
      link(b, a)
    }

    // 1. 逐单元生成线段，记录到邻接表
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const p = j * cols + i
        const a = vals[p]
        const b = vals[p + 1]
        const c = vals[p + cols + 1]
        const d = vals[p + cols]
        const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0)
        if (idx === 0 || idx === 15) continue
        edges[0] = p * 2
        edges[1] = (p + 1) * 2 + 1
        edges[2] = (p + cols) * 2
        edges[3] = p * 2 + 1
        if (idx === 5 || idx === 10) {
          // 鞍点：case 5（b、d 在上）中心偏高、或 case 10（a、c 在上）中心偏低时，a、c 两角被孤立；反之孤立 b、d
          const centerHigh = (a + b + c + d) / 4 > level
          if (centerHigh === (idx === 5)) {
            seg(edges[3], edges[0])
            seg(edges[2], edges[1])
          } else {
            seg(edges[0], edges[1])
            seg(edges[3], edges[2])
          }
          continue
        }
        const [e1, e2] = CASE_SEGMENTS[idx][0]
        seg(edges[e1], edges[e2])
      }
    }

    // 2. 沿邻接表行走，把线段串成折线
    const walk = (start: number): void => {
      const buf: number[] = []
      let prev = -1
      let cur = start
      let last = start
      let lastX = 0
      let lastY = 0
      let pendingX = NaN
      let pendingY = NaN
      while (cur !== -1 && mark[cur] !== stamp) {
        mark[cur] = stamp
        const base = cur >> 1
        const vi = base % cols
        const vj = (base - vi) / cols
        const v0 = vals[base]
        const vertical = (cur & 1) === 1
        const t = (level - v0) / (vals[vertical ? base + cols : base + 1] - v0)
        const x = (vi - 1 + (vertical ? 0 : t)) * cell
        const y = (vj - 1 + (vertical ? t : 0)) * cell
        // 过近的点抽稀，减少路径节点
        if (buf.length === 0 || Math.abs(x - lastX) + Math.abs(y - lastY) >= minStep) {
          buf.push(x, y)
          lastX = x
          lastY = y
          pendingX = NaN
        } else {
          pendingX = x
          pendingY = y
        }
        const na = adjA[cur]
        const nb = adjB[cur]
        const next =
          na !== -1 && na !== prev && mark[na] !== stamp
            ? na
            : nb !== -1 && nb !== prev && mark[nb] !== stamp
              ? nb
              : -1
        prev = cur
        last = cur
        cur = next
      }
      const closed = last !== start && (adjA[last] === start || adjB[last] === start)
      if (closed) buf.push(buf[0], buf[1])
      else if (!Number.isNaN(pendingX)) buf.push(pendingX, pendingY)
      const n = buf.length / 2
      if (n < 3) return
      const pts = Float32Array.from(buf)
      const cum = new Float32Array(n)
      let length = 0
      for (let q = 1; q < n; q++) {
        length += Math.hypot(pts[q * 2] - pts[q * 2 - 2], pts[q * 2 + 1] - pts[q * 2 - 1])
        cum[q] = length
      }
      if (length >= minLength) contours.push({ level: k, pts, cum, length, closed })
    }

    // 先从端点（度为 1）出发提取开放曲线，再处理剩余的闭合环
    for (let n = 0; n < nTouched; n++) {
      if (mark[touched[n]] !== stamp && adjB[touched[n]] === -1) walk(touched[n])
    }
    for (let n = 0; n < nTouched; n++) {
      if (mark[touched[n]] !== stamp) walk(touched[n])
    }
    // 3. 复位本层邻接表
    for (let n = 0; n < nTouched; n++) {
      adjA[touched[n]] = -1
      adjB[touched[n]] = -1
    }
  }
  return contours
}

/**
 * 生成整张等高线场。网格步长随画布面积自适应：1440×900 ≈ 14px。
 * 噪声坐标是绝对像素，高度方向额外生成一段余量，小幅变高时可直接复用。
 */
export function createField(w: number, h: number, hero: boolean, seed: number): ContourField {
  const cell = clamp(Math.round(Math.sqrt((w * h) / 6400)), 10, 16)
  const extent = h + Math.max(REFIT_HEIGHT_DELTA, Math.round(h * REFIT_HEIGHT_RATIO))
  const cols = Math.ceil(w / cell) + 3
  const rows = Math.ceil(extent / cell) + 3
  const levels = hero ? 14 : 11
  const { vals, min, max } = sampleHeights(w, h, hero, seed, cell, cols, rows)
  return {
    width: w,
    height: h,
    extent,
    hero,
    cell,
    levels,
    contours: extractContours(vals, min, max, cell, cols, rows, levels),
    mask: resolveMask(hero, w)
  }
}

/** 宽度不变、高度小幅变化且仍在已生成范围内时，可复用地形，避免形状跳变 */
export function canRefitField(field: ContourField, w: number, h: number): boolean {
  if (w !== field.width || h > field.extent) return false
  return Math.abs(h - field.height) < Math.max(REFIT_HEIGHT_DELTA, field.height * REFIT_HEIGHT_RATIO)
}

/** 原地更新视口高度；蒙版断点按高度比例求值，无需重算 */
export function refitField(field: ContourField, h: number): void {
  field.height = h
}

// ==================== 静态层绘制 ====================

/** 等值层描边样式：奇偶交替（奇数层偏靛蓝），整体随高度向靛蓝过渡；每 4 条加重一条计曲线 */
function levelStyle(k: number, field: ContourField, theme: FieldTheme): { color: string; width: number } {
  const t = field.levels > 1 ? k / (field.levels - 1) : 1
  const rise = t * t * (3 - 2 * t)
  const mix = clamp(rise * 0.8 + (k % 2 === 1 ? 0.3 : 0), 0, 1)
  const lo = theme.dark ? DARK_LOW : LIGHT_LOW
  const hi = theme.dark ? DARK_HIGH : LIGHT_HIGH
  const isIndex = k % 4 === 3
  const alpha = Math.min(0.2, lerp(lo.a, hi.a, mix) * (isIndex ? 1.35 : 1)) * theme.strength
  const rgb = lo.rgb.map((v, i) => Math.round(lerp(v, hi.rgb[i], mix))).join(', ')
  return {
    color: `rgba(${rgb}, ${alpha.toFixed(3)})`,
    width: (isIndex ? 1.15 : 0.85) * (field.hero ? 1 : 0.9)
  }
}

/** 二次曲线中点平滑描出一条折线 */
function tracePath(ctx: CanvasRenderingContext2D, c: Contour): void {
  const p = c.pts
  const mid = (a: number, b: number): [number, number] => [(p[a * 2] + p[b * 2]) / 2, (p[a * 2 + 1] + p[b * 2 + 1]) / 2]
  if (c.closed) {
    const m = p.length / 2 - 1
    if (m < 3) return
    ctx.moveTo(...mid(0, 1))
    for (let i = 1; i <= m; i++) {
      const a = i % m
      ctx.quadraticCurveTo(p[a * 2], p[a * 2 + 1], ...mid(a, (i + 1) % m))
    }
    ctx.closePath()
    return
  }
  const n = p.length / 2
  ctx.moveTo(p[0], p[1])
  for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(p[i * 2], p[i * 2 + 1], ...mid(i, i + 1))
  ctx.lineTo(p[n * 2 - 2], p[n * 2 - 1])
}

/** 右下角稀疏点阵，沿 135° 由透明过渡到清晰，呼应 dev-uiux 首屏点阵 */
function drawDots(ctx: CanvasRenderingContext2D, field: ContourField, theme: FieldTheme): void {
  const { width, height } = field
  const gap = 22
  const cx = width * 0.86
  const cy = height * 0.74
  const range = clamp(Math.min(width, height) * 0.36, 130, 320)
  const maxAlpha = (theme.dark ? 0.12 : 0.2) * theme.strength
  ctx.fillStyle = theme.dark ? '#ffffff' : '#5b47e6'
  const x0 = Math.max(0, Math.floor((cx - range) / gap) * gap)
  const y0 = Math.max(0, Math.floor((cy - range) / gap) * gap)
  for (let y = y0; y <= Math.min(height, cy + range); y += gap) {
    for (let x = x0; x <= Math.min(width, cx + range); x += gap) {
      const d = Math.hypot(x - cx, y - cy) / range
      if (d >= 1) continue
      const diag = clamp((x - cx + (y - cy)) / (range * 1.4) + 0.5, 0, 1)
      const a = Math.pow(1 - d, 1.3) * diag * maxAlpha
      if (a < 0.008) continue
      ctx.globalAlpha = a
      ctx.beginPath()
      ctx.arc(x, y, 0.85, 0, TAU)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

/** destination-in：保留已有像素 × 渐变不透明度，两次叠乘得到二维渐隐 */
function applyMask(ctx: CanvasRenderingContext2D, field: ContourField): void {
  const fill = (grad: CanvasGradient, stops: Stops): void => {
    for (const [pos, alpha] of stops) grad.addColorStop(pos, `rgba(0, 0, 0, ${alpha})`)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, field.width, field.height)
  }
  ctx.globalCompositeOperation = 'destination-in'
  fill(ctx.createLinearGradient(0, 0, field.width, 0), field.mask.x)
  fill(ctx.createLinearGradient(0, 0, 0, field.height), field.mask.y)
  ctx.globalCompositeOperation = 'source-over'
}

/** 清空图层并设置像素比变换 */
export function resetLayer(ctx: CanvasRenderingContext2D, width: number, height: number, dpr: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, width, height)
}

/** 绘制静态等高线层：按等值层批量描边（每层一次 stroke）→ 点阵 → 渐隐蒙版 */
export function renderField(ctx: CanvasRenderingContext2D, field: ContourField, theme: FieldTheme, dpr: number): void {
  resetLayer(ctx, field.width, field.height, dpr)
  if (theme.strength <= 0) return
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const byLevel: Contour[][] = Array.from({ length: field.levels }, () => [])
  for (const c of field.contours) byLevel[c.level].push(c)
  byLevel.forEach((list, k) => {
    if (list.length === 0) return
    const style = levelStyle(k, field, theme)
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.width
    ctx.beginPath()
    for (const c of list) tracePath(ctx, c)
    ctx.stroke()
  })
  if (field.hero && field.width >= 640) drawDots(ctx, field, theme)
  applyMask(ctx, field)
}

/** 预渲染 ember 柔光贴图，逐帧 drawImage 比每帧创建径向渐变便宜 */
export function createGlowSprite(dpr: number, dark: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  try {
    const size = Math.max(2, Math.ceil(GLOW_RADIUS * 2 * dpr))
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const g = canvas.getContext('2d')
    if (!g) return null
    const rgb = dark ? EMBER.dark : EMBER.light
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, `rgba(${rgb}, 0.55)`)
    grad.addColorStop(0.3, `rgba(${rgb}, 0.2)`)
    grad.addColorStop(1, `rgba(${rgb}, 0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
    return canvas
  } catch {
    return null
  }
}

// ==================== 光点 ====================

/** 把包围盒外扩、取整并裁到画布内；完全在画布外时返回 null */
function snapRect(b: Rect, field: ContourField): Rect | null {
  const x0 = Math.max(0, Math.floor(b.x0 - DIRTY_PAD))
  const y0 = Math.max(0, Math.floor(b.y0 - DIRTY_PAD))
  const x1 = Math.min(field.width, Math.ceil(b.x1 + DIRTY_PAD))
  const y1 = Math.min(field.height, Math.ceil(b.y1 + DIRTY_PAD))
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null
}

function growRect(b: Rect, x: number, y: number, r: number): void {
  if (x - r < b.x0) b.x0 = x - r
  if (y - r < b.y0) b.y0 = y - r
  if (x + r > b.x1) b.x1 = x + r
  if (y + r > b.y1) b.y1 = y + r
}

/** 合并相交的脏矩形，减少 clearRect 次数（数量 ≤ 14，开销可忽略） */
function mergeRects(rects: Rect[]): Rect[] {
  const out = rects.map((r) => ({ ...r }))
  for (let i = 0; i < out.length; i++) {
    for (let j = i + 1; j < out.length; j++) {
      const a = out[i]
      const b = out[j]
      if (a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1) {
        a.x0 = Math.min(a.x0, b.x0)
        a.y0 = Math.min(a.y0, b.y0)
        a.x1 = Math.max(a.x1, b.x1)
        a.y1 = Math.max(a.y1, b.y1)
        out.splice(j, 1)
        // 合并后的矩形变大，需重新与其余矩形比较
        j = i
      }
    }
  }
  return out
}

/** 默认光点数量：hero 按宽度 3~5 个；ambient 显式开启时 3 个 */
export function defaultSparkCount(field: ContourField): number {
  if (!field.hero) return 3
  return field.width >= 1200 ? 5 : field.width >= 768 ? 4 : 3
}

/** ember 光点系统：在等高线上游走，带尾迹、柔光与偶发光痕 */
export class SparkSystem {
  private sparks: Spark[] = []
  private glints: Glint[] = []
  private candidates: number[] = []
  private weights: number[] = []
  /** 上一帧画过的区域；null 表示未知，需整幅清空 */
  private dirty: Rect[] | null = null
  private readonly rand: () => number
  private readonly pt: Point = { x: 0, y: 0 }

  /**
   * @param settled 减少动效模式：光点直接完整显示且不再移动
   */
  constructor(
    private readonly field: ContourField,
    count: number,
    seed: number,
    settled: boolean
  ) {
    this.rand = mulberry32((seed ^ 0x9e3779b9) >>> 0)
    this.collectCandidates()
    if (this.candidates.length === 0) return
    for (let i = 0; i < Math.min(6, count); i++) {
      const sp: Spark = { c: 0, s: 0, dir: 1, speed: 0, trail: 0, fade: 0, ttl: 0, glintIn: 0 }
      this.spawn(sp, true)
      if (settled) sp.fade = 1
      this.sparks.push(sp)
    }
  }

  get size(): number {
    return this.sparks.length
  }

  /** 切换到静止状态（减少动效） */
  settle(): void {
    this.glints = []
    for (const sp of this.sparks) sp.fade = 1
  }

  /** 光点候选线：足够长、整体落在清晰区域、偏高的等值层；按长度加权 */
  private collectCandidates(): void {
    const { contours, levels } = this.field
    const minLevel = Math.floor(levels * 0.2)
    const meanMask = (c: Contour): number => {
      const n = c.pts.length / 2
      const samples = [0.15, 0.35, 0.5, 0.65, 0.85]
      let sum = 0
      for (const f of samples) {
        const i = Math.floor(f * (n - 1))
        sum += fieldMaskAt(this.field, c.pts[i * 2], c.pts[i * 2 + 1])
      }
      return sum / samples.length
    }
    contours.forEach((c, i) => {
      if (c.level >= minLevel && c.length >= 160 && meanMask(c) >= 0.5) this.candidates.push(i)
    })
    if (this.candidates.length === 0) {
      contours.forEach((c, i) => {
        if (c.length >= 80) this.candidates.push(i)
      })
    }
    this.weights = this.candidates.map((i) => Math.min(contours[i].length, 900))
  }

  private pickContour(): number {
    let r = this.rand() * this.weights.reduce((sum, w) => sum + w, 0)
    for (let i = 0; i < this.candidates.length; i++) {
      r -= this.weights[i]
      if (r <= 0) return this.candidates[i]
    }
    return this.candidates[this.candidates.length - 1]
  }

  /** 候选出生点是否可用：落在画布可见区域内，且与其他光点保持间距，避免成对扎堆 */
  private isGoodSpawn(self: Spark, x: number, y: number): boolean {
    const { width, height, contours } = this.field
    const margin = 24
    if (x < margin || y < margin || x > width - margin || y > height - margin) return false
    if (fieldMaskAt(this.field, x, y) < 0.35) return false
    const minGap = Math.min(MIN_SPARK_GAP, width * 0.22)
    for (const other of this.sparks) {
      if (other === self) continue
      pointAt(contours[other.c], other.s, this.pt)
      if (Math.hypot(this.pt.x - x, this.pt.y - y) < minGap) return false
    }
    return true
  }

  private spawn(sp: Spark, initial: boolean): void {
    const { contours } = this.field
    // 最多尝试若干次寻找合适出生点，找不到就用最后一次的结果
    for (let attempt = 0; attempt < 10; attempt++) {
      sp.c = this.pickContour()
      sp.s = this.rand() * contours[sp.c].length
      pointAt(contours[sp.c], sp.s, this.pt)
      if (this.isGoodSpawn(sp, this.pt.x, this.pt.y)) break
    }
    sp.dir = this.rand() < 0.5 ? -1 : 1
    sp.speed = 10 + this.rand() * 12
    sp.trail = 6 + this.rand() * 8
    // 首批错峰出现，避免同时亮起
    sp.fade = initial ? -this.rand() * 1.6 : 0
    sp.ttl = 18 + this.rand() * 22
    sp.glintIn = 3 + this.rand() * 6
  }

  /** 推进 dt 秒 */
  step(dt: number): void {
    const { contours } = this.field
    for (const sp of this.sparks) {
      const c = contours[sp.c]
      sp.fade = Math.min(1, sp.fade + dt / FADE_IN_SECONDS)
      sp.ttl -= dt
      sp.s += sp.dir * sp.speed * dt
      if (sp.ttl <= 0 || (!c.closed && (sp.s <= 0 || sp.s >= c.length))) {
        this.spawn(sp, false)
        continue
      }
      if (c.closed) sp.s = ((sp.s % c.length) + c.length) % c.length
      sp.glintIn -= dt
      if (sp.glintIn <= 0 && sp.fade >= 1) {
        // 偶尔在走过的线上留下一段淡出的光痕
        if (this.glints.length >= MAX_GLINTS) this.glints.shift()
        this.glints.push({
          c: sp.c,
          from: sp.s - sp.dir * (36 + this.rand() * 44),
          to: sp.s,
          age: 0,
          life: 1.8 + this.rand() * 1.2
        })
        sp.glintIn = 4 + this.rand() * 6
      }
    }
    for (const g of this.glints) g.age += dt
    this.glints = this.glints.filter((g) => g.age < g.life)
  }

  /**
   * 绘制当前帧。默认只擦除上一帧画过的脏矩形；full 为 true（画布尺寸 / 主题变化后）时整幅清空。
   */
  draw(
    ctx: CanvasRenderingContext2D,
    theme: FieldTheme,
    dpr: number,
    sprite: HTMLCanvasElement | null,
    full = false
  ): void {
    const { field, pt } = this
    if (full || !this.dirty) {
      resetLayer(ctx, field.width, field.height, dpr)
    } else {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalAlpha = 1
      for (const r of mergeRects(this.dirty)) ctx.clearRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0)
    }
    const drawn: Rect[] = []
    this.dirty = drawn
    if (this.sparks.length === 0) return
    const record = (b: Rect): void => {
      const r = snapRect(b, field)
      if (r) drawn.push(r)
    }
    const sparkAlpha = 0.55 + 0.45 * theme.strength
    ctx.lineCap = 'round'
    ctx.strokeStyle = `rgb(${theme.dark ? EMBER.dark : EMBER.light})`

    // 光痕：沿线一小段，朝光点方向渐强，整体随寿命淡出
    ctx.lineWidth = 1.1
    for (const g of this.glints) {
      const c = field.contours[g.c]
      const life = 1 - g.age / g.life
      const span = g.to - g.from
      const steps = clamp(Math.ceil(Math.abs(span) / 6), 2, 16)
      pointAt(c, g.from, pt)
      let px = pt.x
      let py = pt.y
      const box: Rect = { x0: px, y0: py, x1: px, y1: py }
      for (let i = 1; i <= steps; i++) {
        pointAt(c, g.from + (span * i) / steps, pt)
        ctx.globalAlpha = 0.4 * life * life * (i / steps) * fieldMaskAt(field, pt.x, pt.y) * sparkAlpha
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
        growRect(box, pt.x, pt.y, 1)
        px = pt.x
        py = pt.y
      }
      record(box)
    }

    for (const sp of this.sparks) {
      const c = field.contours[sp.c]
      pointAt(c, sp.s, pt)
      const hx = pt.x
      const hy = pt.y
      let alpha = clamp(sp.fade, 0, 1) * sparkAlpha * Math.sqrt(fieldMaskAt(field, hx, hy))
      if (!c.closed) alpha *= clamp(Math.min(sp.s, c.length - sp.s) / 48, 0, 1)
      alpha *= clamp(sp.ttl / FADE_OUT_SECONDS, 0, 1)
      if (alpha <= 0.01) continue
      const box: Rect = { x0: hx, y0: hy, x1: hx, y1: hy }
      growRect(box, hx, hy, sprite ? GLOW_RADIUS : 2)

      // 尾迹：逐段变细变淡
      let px = hx
      let py = hy
      for (let k = 1; k <= TRAIL_STEPS; k++) {
        pointAt(c, sp.s - (sp.dir * sp.trail * k) / TRAIL_STEPS, pt)
        const f = 1 - (k - 1) / TRAIL_STEPS
        ctx.globalAlpha = alpha * 0.6 * f
        ctx.lineWidth = 0.5 + 1.3 * f
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
        growRect(box, pt.x, pt.y, 1)
        px = pt.x
        py = pt.y
      }

      // 柔光 + 光核
      if (sprite) {
        ctx.globalAlpha = alpha * 0.9
        ctx.drawImage(sprite, hx - GLOW_RADIUS, hy - GLOW_RADIUS, GLOW_RADIUS * 2, GLOW_RADIUS * 2)
      }
      ctx.globalAlpha = alpha
      ctx.fillStyle = theme.dark ? EMBER_CORE.dark : EMBER_CORE.light
      ctx.beginPath()
      ctx.arc(hx, hy, 1.4, 0, TAU)
      ctx.fill()
      record(box)
    }
    ctx.globalAlpha = 1
  }
}
