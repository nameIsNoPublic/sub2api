import { CHART_SERIES } from '@/utils/chartTheme'

/**
 * 环形图扇区归并规则（与 52code 图表色板一致）：
 * 分类色只有 CHART_SERIES.length 个，扇区不复用色相。条目数超过色板容量时，
 * 只画前「容量 - 1」个，其余条目连同已有的「其他」一起并入一个中性色扇区；
 * 明细表仍列出全部条目，被并入的行用中性色色点，与扇区一一对应。
 */

/** 环形图最多扇区数（含「其他」） */
export const MAX_DOUGHNUT_SLICES = CHART_SERIES.length

export interface DoughnutEntry {
  label: string
  value: number
  /** 调用方已有的「其他」条目（如消费排行里未上榜用户的合计），总是走中性色 */
  isOther?: boolean
}

export interface DoughnutSlices {
  labels: string[]
  data: number[]
  backgroundColor: string[]
  /**
   * 从第几个常规条目开始被并入「其他」扇区；未归并时为 null。
   * 明细表用它决定色点颜色。
   */
  groupedFrom: number | null
}

export interface DoughnutSliceOptions {
  /** 第 index 个常规扇区的颜色 */
  colorAt: (index: number) => string
  /** 「其他」扇区颜色（中性色） */
  otherColor: string
  /** 「其他」扇区标签 */
  otherLabel: string
  /** 最多扇区数，默认色板容量 */
  maxSlices?: number
}

export function buildDoughnutSlices(entries: DoughnutEntry[], options: DoughnutSliceOptions): DoughnutSlices {
  const maxSlices = Math.max(2, options.maxSlices ?? MAX_DOUGHNUT_SLICES)
  const regular = entries.filter((entry) => !entry.isOther)
  const explicitOther = entries.filter((entry) => entry.isOther)
  const needsGrouping = regular.length + (explicitOther.length > 0 ? 1 : 0) > maxSlices

  const head = needsGrouping ? regular.slice(0, maxSlices - 1) : regular
  const merged = needsGrouping ? [...regular.slice(maxSlices - 1), ...explicitOther] : explicitOther

  const labels = head.map((entry) => entry.label)
  const data = head.map((entry) => entry.value)
  const backgroundColor = head.map((_, index) => options.colorAt(index))

  if (merged.length > 0) {
    // 未归并时保留调用方「其他」条目的原标签
    labels.push(needsGrouping || explicitOther.length !== 1 ? options.otherLabel : explicitOther[0].label)
    data.push(merged.reduce((sum, entry) => sum + entry.value, 0))
    backgroundColor.push(options.otherColor)
  }

  return { labels, data, backgroundColor, groupedFrom: needsGrouping ? maxSlices - 1 : null }
}

/** 明细表第 index 个常规条目的色点：被并入「其他」的条目用中性色 */
export function swatchColorAt(
  index: number,
  groupedFrom: number | null,
  colorAt: (index: number) => string,
  otherColor: string
): string {
  return groupedFrom !== null && index >= groupedFrom ? otherColor : colorAt(index)
}
