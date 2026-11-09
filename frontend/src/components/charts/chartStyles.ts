/**
 * 图表卡片共享的 Tailwind 类名，保证仪表盘、用量页、账号统计弹窗中的图表头部一致。
 */

/** 卡片头部：标题 + 右侧控件，底部 1px 分隔线 */
export const CHART_CARD_HEADER =
  'flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5 dark:border-dark-800'

/** 卡片标题 */
export const CHART_CARD_TITLE = 'text-sm font-semibold tracking-tight text-gray-950 dark:text-white'

/** 分段控件容器（小号） */
export const SEGMENT_GROUP =
  'inline-flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 ring-1 ring-inset ring-gray-200/60 dark:bg-dark-950 dark:ring-dark-800'

/** 分段控件按钮 */
export function segmentButtonClass(active: boolean): string {
  return [
    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40',
    active
      ? 'bg-white text-gray-950 shadow-[0_1px_2px_rgba(23,24,28,0.08)] ring-1 ring-gray-200/70 dark:bg-dark-700 dark:text-white dark:ring-dark-600'
      : 'text-gray-500 hover:text-gray-900 dark:text-dark-400 dark:hover:text-white'
  ].join(' ')
}

/** 明细表表头单元格 */
export const TABLE_HEAD_CELL =
  'pb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-gray-500 dark:text-dark-400'

/** 明细表行 */
export const TABLE_ROW = 'border-t border-gray-100 transition-colors dark:border-dark-800'

/** 可展开行的悬停态 */
export const TABLE_ROW_INTERACTIVE = 'cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-800/50'

/** 可点击名称（可展开下钻） */
export const INTERACTIVE_NAME =
  'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300'

/** 环形图通用参数：细环 + 扇区间隙 */
export const DOUGHNUT_CUTOUT = '70%'
