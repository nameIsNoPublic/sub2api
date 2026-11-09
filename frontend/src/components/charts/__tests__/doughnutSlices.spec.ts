import { describe, expect, it } from 'vitest'

import { MAX_DOUGHNUT_SLICES, buildDoughnutSlices, swatchColorAt } from '../doughnutSlices'
import { CHART_SERIES } from '@/utils/chartTheme'

const colorAt = (index: number) => `c${index}`
const options = { colorAt, otherColor: 'neutral', otherLabel: 'Others' }
const entries = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ label: `item-${i}`, value: count - i }))

describe('buildDoughnutSlices', () => {
  it('matches the palette size', () => {
    expect(MAX_DOUGHNUT_SLICES).toBe(CHART_SERIES.length)
  })

  it('draws every entry with its own color when within the palette size', () => {
    const slices = buildDoughnutSlices(entries(MAX_DOUGHNUT_SLICES), options)
    expect(slices.labels).toHaveLength(MAX_DOUGHNUT_SLICES)
    expect(slices.backgroundColor).toEqual(entries(MAX_DOUGHNUT_SLICES).map((_, i) => `c${i}`))
    expect(slices.groupedFrom).toBeNull()
  })

  it('merges the tail into a neutral Others slice once entries exceed the palette size', () => {
    const count = MAX_DOUGHNUT_SLICES + 2
    const input = entries(count)
    const slices = buildDoughnutSlices(input, options)
    const keep = MAX_DOUGHNUT_SLICES - 1

    expect(slices.labels).toHaveLength(MAX_DOUGHNUT_SLICES)
    expect(slices.labels.slice(0, keep)).toEqual(input.slice(0, keep).map((e) => e.label))
    expect(slices.labels[keep]).toBe('Others')
    expect(slices.data[keep]).toBe(input.slice(keep).reduce((sum, e) => sum + e.value, 0))
    expect(slices.backgroundColor[keep]).toBe('neutral')
    // 不复用色相：常规扇区颜色互不相同
    expect(new Set(slices.backgroundColor.slice(0, keep)).size).toBe(keep)
    expect(slices.groupedFrom).toBe(keep)
  })

  it('keeps an existing Others entry as-is when nothing needs merging', () => {
    const slices = buildDoughnutSlices(
      [...entries(3), { label: 'Rest', value: 10, isOther: true }],
      options
    )
    expect(slices.labels).toEqual(['item-0', 'item-1', 'item-2', 'Rest'])
    expect(slices.backgroundColor[3]).toBe('neutral')
    expect(slices.groupedFrom).toBeNull()
  })

  it('folds an existing Others entry into the merged slice when grouping', () => {
    const regular = entries(MAX_DOUGHNUT_SLICES)
    const slices = buildDoughnutSlices([...regular, { label: 'Rest', value: 100, isOther: true }], options)
    const keep = MAX_DOUGHNUT_SLICES - 1

    expect(slices.labels).toHaveLength(MAX_DOUGHNUT_SLICES)
    expect(slices.labels[keep]).toBe('Others')
    expect(slices.data[keep]).toBe(regular.slice(keep).reduce((sum, e) => sum + e.value, 0) + 100)
  })
})

describe('swatchColorAt', () => {
  it('uses the neutral color for rows merged into Others', () => {
    expect(swatchColorAt(2, null, colorAt, 'neutral')).toBe('c2')
    expect(swatchColorAt(6, 7, colorAt, 'neutral')).toBe('c6')
    expect(swatchColorAt(7, 7, colorAt, 'neutral')).toBe('neutral')
    expect(swatchColorAt(9, 7, colorAt, 'neutral')).toBe('neutral')
  })
})
