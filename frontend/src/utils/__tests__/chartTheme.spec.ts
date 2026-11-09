import { describe, expect, it } from 'vitest'
import { CHART_SERIES, CHART_SERIES_DARK, seriesColor, seriesDash } from '@/utils/chartTheme'

describe('chartTheme categorical palette', () => {
  it('keeps exactly 8 validated hues in both modes, brand colors first', () => {
    expect(CHART_SERIES).toHaveLength(8)
    expect(CHART_SERIES_DARK).toHaveLength(8)
    expect(CHART_SERIES[0]).toBe('#5b47e6')
    expect(CHART_SERIES[1]).toBe('#f2711c')
    expect(new Set(CHART_SERIES).size).toBe(8)
    expect(new Set(CHART_SERIES_DARK).size).toBe(8)
  })

  it('cycles colors beyond the palette length', () => {
    expect(seriesColor(8)).toBe(seriesColor(0))
    expect(seriesColor(9, true)).toBe(seriesColor(1, true))
    expect(seriesColor(-1)).toBe(CHART_SERIES[7])
  })
})

describe('seriesDash composite encoding', () => {
  it('draws the first 8 series solid', () => {
    for (let i = 0; i < 8; i += 1) {
      expect(seriesDash(i)).toBeUndefined()
    }
  })

  it('dashes reused colors so they stay distinguishable', () => {
    const firstOverflow = seriesDash(8)
    expect(firstOverflow).toBeDefined()
    expect(seriesDash(11)).toEqual(firstOverflow)

    const secondOverflow = seriesDash(16)
    expect(secondOverflow).toBeDefined()
    expect(secondOverflow).not.toEqual(firstOverflow)
  })

  it('treats negative indexes as solid', () => {
    expect(seriesDash(-3)).toBeUndefined()
  })
})
