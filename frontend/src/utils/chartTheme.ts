/**
 * 52code 图表主题（Chart.js）。
 * 所有图表统一从这里取颜色与字体，保证仪表盘、运维页、监控页配色一致。
 * 色序原则：靛蓝主色打头，ember 信号色次之。
 *
 * 分类色固定 8 个，顺序经 dataviz 校验脚本验证（相邻对 CVD ΔE ≥ 8、正常视觉 ΔE ≥ 15、
 * 亮度带与彩度下限均通过；浅色对白底、深色对 dark-900 #131418）。调整顺序或色值后须重新校验。
 * 超过 8 个系列时不再生成新色相：第 9 个起复用前面的颜色并改用虚线（组合编码，见 seriesDash）。
 */

/** 分类系列色（浅色模式，按顺序分配给数据集）。 */
export const CHART_SERIES = [
  '#5b47e6', // 靛蓝 primary-600（品牌）
  '#f2711c', // ember-500（品牌）
  '#1baf7a', // 青绿
  '#eda100', // 黄
  '#e87ba4', // 洋红
  '#008300', // 绿
  '#2a78d6', // 蓝
  '#e34948' // 红
] as const

/** 分类系列色（深色模式，同序同色相，按深色表面重新取阶并单独校验）。 */
export const CHART_SERIES_DARK = [
  '#7262f1', // 靛蓝 primary-500
  '#e0620f', // ember-600
  '#199e70', // 青绿
  '#c98500', // 黄
  '#d55181', // 洋红
  '#0ca30c', // 绿
  '#3987e5', // 蓝
  '#e66767' // 红
] as const

/** 超出分类色数量后的虚线样式（第 9–16 个系列用第一种，再往后用第二种）。 */
const SERIES_OVERFLOW_DASHES: ReadonlyArray<number[]> = [
  [6, 4],
  [2, 3]
]

/** 语义色：Token 构成等固定含义的数据集使用。 */
export const CHART_SEMANTIC = {
  light: {
    input: '#5b47e6',
    output: '#f2711c',
    cacheCreation: '#f59e0b',
    cacheRead: '#0ea5e9',
    cacheHitRate: '#10b981',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    neutral: '#a5a6a9'
  },
  dark: {
    input: '#9688f8',
    output: '#fb8b3c',
    cacheCreation: '#fbbf24',
    cacheRead: '#38bdf8',
    cacheHitRate: '#34d399',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    neutral: '#61636c'
  }
} as const

export interface ChartChrome {
  /** 坐标轴刻度 / 图例文字 */
  text: string
  /** 次要文字 */
  muted: string
  /** 网格线 */
  grid: string
  /** 坐标轴边线 */
  border: string
  /** Tooltip 背景 */
  tooltipBg: string
  /** Tooltip 文字 */
  tooltipText: string
  /** Tooltip 边框 */
  tooltipBorder: string
}

/** 图表外观色（文字、网格、Tooltip），随明暗主题切换。 */
export function getChartChrome(isDark: boolean): ChartChrome {
  return isDark
    ? {
        text: '#cfd0d7',
        muted: '#83858f',
        grid: 'rgba(255, 255, 255, 0.06)',
        border: '#2e3037',
        tooltipBg: '#1c1d23',
        tooltipText: '#f5f5f7',
        tooltipBorder: '#2e3037'
      }
    : {
        text: '#3b3d44',
        muted: '#76787e',
        grid: 'rgba(23, 24, 28, 0.06)',
        border: '#e4e4e0',
        tooltipBg: '#17181c',
        tooltipText: '#f7f7f5',
        tooltipBorder: '#17181c'
      }
}

/** 取第 index 个系列色（超过 8 个时循环，需配合 seriesDash 区分）。 */
export function seriesColor(index: number, isDark = false): string {
  const palette = isDark ? CHART_SERIES_DARK : CHART_SERIES
  return palette[((index % palette.length) + palette.length) % palette.length]
}

/**
 * 第 index 个系列的折线虚线样式：前 8 个为实线（undefined），之后按轮次换虚线，
 * 与 seriesColor 组合编码，保证复用颜色的系列仍可区分。
 */
export function seriesDash(index: number): number[] | undefined {
  const round = Math.floor(Math.max(0, index) / CHART_SERIES.length)
  if (round === 0) return undefined
  return SERIES_OVERFLOW_DASHES[(round - 1) % SERIES_OVERFLOW_DASHES.length]
}

/** 十六进制颜色加透明度，用于面积图填充。 */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 图表字体：与全站一致，数字走等宽。 */
export const CHART_FONT = {
  family: '"Geist Variable", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  mono: '"Geist Mono Variable", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
} as const
