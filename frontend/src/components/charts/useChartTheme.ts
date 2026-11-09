import { computed, getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import {
  CHART_FONT,
  CHART_SEMANTIC,
  getChartChrome,
  seriesColor,
  seriesDash,
  withAlpha,
  type ChartChrome
} from '@/utils/chartTheme'

/**
 * 图表主题组合式函数：把 52code chartTheme 与明暗主题切换绑定成响应式值。
 * 主题切换只改 <html> 的 dark class，这里用一个共享 MutationObserver 监听，
 * 所有图表组件共用同一个 isDark ref，组件全部卸载后自动断开观察。
 */

const isDarkRef = ref(readIsDark())
let observer: MutationObserver | null = null
let consumers = 0

function readIsDark(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
}

function retainObserver(): void {
  consumers += 1
  if (observer || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return
  observer = new MutationObserver(() => {
    const next = readIsDark()
    if (next !== isDarkRef.value) isDarkRef.value = next
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
}

function releaseObserver(): void {
  consumers = Math.max(0, consumers - 1)
  if (consumers === 0 && observer) {
    observer.disconnect()
    observer = null
  }
}

/** Chart.js tooltip 统一外观：墨色底、等宽数值。 */
export function buildTooltipStyle(chrome: ChartChrome) {
  return {
    backgroundColor: chrome.tooltipBg,
    titleColor: chrome.tooltipText,
    bodyColor: chrome.tooltipText,
    footerColor: withAlpha('#f7f7f5', 0.66),
    borderColor: chrome.tooltipBorder,
    borderWidth: 1,
    cornerRadius: 8,
    padding: 10,
    boxPadding: 4,
    boxWidth: 8,
    boxHeight: 8,
    usePointStyle: true,
    titleFont: { family: CHART_FONT.family, size: 12, weight: 600 as const },
    bodyFont: { family: CHART_FONT.mono, size: 11 },
    footerFont: { family: CHART_FONT.mono, size: 10, weight: 400 as const },
    footerMarginTop: 6
  }
}

export function useChartTheme() {
  // 同步一次，避免组件挂载前主题已切换导致首帧配色错误
  isDarkRef.value = readIsDark()
  if (getCurrentInstance()) {
    retainObserver()
    onBeforeUnmount(releaseObserver)
  }

  const isDark = computed(() => isDarkRef.value)
  const chrome = computed(() => getChartChrome(isDarkRef.value))
  const semantic = computed(() => (isDarkRef.value ? CHART_SEMANTIC.dark : CHART_SEMANTIC.light))
  const tooltip = computed(() => buildTooltipStyle(chrome.value))
  /** 卡片表面色：环形图扇区描边用它制造间隙。 */
  const surface = computed(() => (isDarkRef.value ? '#131418' : '#ffffff'))

  const series = (index: number) => seriesColor(index, isDarkRef.value)
  /** 折线系列虚线：超过 8 个系列时与 series() 组合编码。 */
  const dash = (index: number) => seriesDash(index)

  return { isDark, chrome, semantic, tooltip, surface, series, dash, font: CHART_FONT }
}
