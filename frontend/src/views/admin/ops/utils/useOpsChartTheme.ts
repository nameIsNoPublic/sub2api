import { computed } from 'vue'
import { useChartTheme } from '@/components/charts/useChartTheme'
import { CHART_FONT, withAlpha } from '@/utils/chartTheme'

/**
 * 管理端看板图表主题（运维监控 / 仪表盘共用）。
 * - 明暗主题响应、tooltip、配色全部复用共享的 useChartTheme（单个 MutationObserver）
 * - 本文件只补充运维图表通用的刻度 / 图例 / 网格 / 坐标轴配置
 */
export function useOpsChartTheme() {
  const { isDark, chrome, semantic, tooltip, surface, series, dash } = useChartTheme()

  /** 刻度字体：数字走等宽。 */
  const tickFont = { family: CHART_FONT.mono, size: 10 }

  /** 图例：圆点 + 正文字体。 */
  const legendLabels = computed(() => ({
    color: chrome.value.text,
    usePointStyle: true,
    pointStyle: 'circle' as const,
    boxWidth: 6,
    boxHeight: 6,
    padding: 12,
    font: { family: CHART_FONT.family, size: 11 }
  }))

  /** 数值轴网格线颜色。 */
  const gridLine = computed(() => ({ color: chrome.value.grid }))

  /** 数值轴边线：隐藏轴线，网格线用细虚线（Chart.js v4 的 border.dash 作用于网格线）。 */
  const valueAxisBorder = { display: false, dash: [3, 3] }

  /** 类目轴边线：保留一条极淡的基线。 */
  const categoryAxisBorder = computed(() => ({ display: true, color: chrome.value.border }))

  return {
    isDark,
    chrome,
    semantic,
    series,
    dash,
    surface,
    tickFont,
    legendLabels,
    tooltip,
    gridLine,
    valueAxisBorder,
    categoryAxisBorder,
    withAlpha
  }
}
