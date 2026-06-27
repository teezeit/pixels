import { describe, it, expect } from 'vitest'
import { buildFigure } from './chart'
import type { ChartConfig } from './chart'
import type { EntryWithAvg } from './dataProcessing'

function makeConfig(overrides: Partial<ChartConfig> = {}): ChartConfig {
  return {
    windowDays: 7,
    windowLabel: '1w',
    neutralAt: null,
    lineColor: '#6366f1',
    yearsToPlot: [],
    ...overrides,
  }
}

function makeEntry(dateStr: string, rollingAvg: number | null): EntryWithAvg {
  return { date: new Date(dateStr), score: rollingAvg, rollingAvg }
}

const ENTRIES_2023 = [
  makeEntry('2023-01-10', 4),
  makeEntry('2023-06-15', 5),
  makeEntry('2023-11-20', 3),
]

const ENTRIES_2024 = [
  makeEntry('2024-03-01', 2),
  makeEntry('2024-07-04', 1),
  makeEntry('2024-09-09', 2),
]

const ALL_ENTRIES = [...ENTRIES_2023, ...ENTRIES_2024]

// --- empty state ---

describe('buildFigure — empty yearsToPlot', () => {
  it('returns empty data and layout', () => {
    const { data, layout } = buildFigure(ALL_ENTRIES, makeConfig())
    expect(data).toHaveLength(0)
    expect(layout).toEqual({})
  })
})

// --- title ---

describe('buildFigure — plot title', () => {
  it('is "Mood" when windowLabel is None', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ windowLabel: 'None', yearsToPlot: ['2023'] }))
    expect((layout.title as { text: string }).text).toBe('Mood')
  })

  it('includes windowLabel when smoothing is active', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ windowLabel: '1w', yearsToPlot: ['2023'] }))
    expect((layout.title as { text: string }).text).toBe('Mood — 1w rolling average')
  })
})

// --- y axis range ---

describe('buildFigure — y axis range', () => {
  it('is [1, 5] when neutralAt is null', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ yearsToPlot: ['2023'], neutralAt: null }))
    const yaxis = (layout as Record<string, { range?: number[] }>).yaxis
    expect(yaxis.range).toEqual([1, 5])
  })

  it('is [-2, 2] when neutralAt is 3', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ yearsToPlot: ['2023'], neutralAt: 3 }))
    const yaxis = (layout as Record<string, { range?: number[] }>).yaxis
    expect(yaxis.range).toEqual([-2, 2])
  })
})

// --- y axis tick values ---

describe('buildFigure — y axis ticks', () => {
  it('uses ticks 1–5 when no offset', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ yearsToPlot: ['2023'], neutralAt: null }))
    const yaxis = (layout as Record<string, { tickvals?: number[] }>).yaxis
    expect(yaxis.tickvals).toEqual([1, 2, 3, 4, 5])
  })

  it('uses ticks -2 to 2 when offset is 3', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ yearsToPlot: ['2023'], neutralAt: 3 }))
    const yaxis = (layout as Record<string, { tickvals?: number[] }>).yaxis
    expect(yaxis.tickvals).toEqual([-2, -1, 0, 1, 2])
  })
})

// --- zero axis shape ---

describe('buildFigure — zero axis shape', () => {
  it('is absent when neutralAt is null', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ yearsToPlot: ['2023'], neutralAt: null }))
    const zeroShapes = layout.shapes?.filter(s => 'y0' in s && s.y0 === 0 && (s.line as { width?: number })?.width === 2)
    expect(zeroShapes).toHaveLength(0)
  })

  it('is present when neutralAt is 3', () => {
    const { layout } = buildFigure(ENTRIES_2023, makeConfig({ yearsToPlot: ['2023'], neutralAt: 3 }))
    const zeroShapes = layout.shapes?.filter(s => 'y0' in s && s.y0 === 0 && (s.line as { width?: number })?.width === 2)
    expect(zeroShapes).toHaveLength(1)
  })

  it('adds one zero shape per selected year', () => {
    const { layout } = buildFigure(ALL_ENTRIES, makeConfig({ yearsToPlot: ['2023', '2024'], neutralAt: 3 }))
    const zeroShapes = layout.shapes?.filter(s => 'y0' in s && s.y0 === 0 && (s.line as { width?: number })?.width === 2)
    expect(zeroShapes).toHaveLength(2)
  })
})

// --- per-year means ---

describe('buildFigure — per-year avg annotations', () => {
  it('produces different avg labels for years with different data', () => {
    const { layout } = buildFigure(ALL_ENTRIES, makeConfig({ yearsToPlot: ['2023', '2024'], neutralAt: null }))
    const avgAnnotations = layout.annotations?.filter(a => typeof a.text === 'string' && a.text.startsWith('avg'))
    expect(avgAnnotations).toHaveLength(2)
    // 2023 avg: (4+5+3)/3 = 4.00, 2024 avg: (2+1+2)/3 = 1.67 — they must differ
    expect(avgAnnotations![0].text).not.toBe(avgAnnotations![1].text)
  })

  it('shifts avg by offset when neutralAt is 3', () => {
    const entries = [makeEntry('2023-06-01', 3)]
    const { layout } = buildFigure(entries, makeConfig({ yearsToPlot: ['2023'], neutralAt: 3 }))
    const avgAnnotation = layout.annotations?.find(a => typeof a.text === 'string' && a.text.startsWith('avg'))
    // score 3, offset 3 → mean 0 → label "avg +0.00"
    expect(avgAnnotation?.text).toBe('avg +0.00')
  })
})

// --- trace count ---

describe('buildFigure — data traces', () => {
  it('produces one trace per selected year', () => {
    const { data } = buildFigure(ALL_ENTRIES, makeConfig({ yearsToPlot: ['2023', '2024'] }))
    expect(data).toHaveLength(2)
  })

  it('excludes unselected years from traces', () => {
    const { data } = buildFigure(ALL_ENTRIES, makeConfig({ yearsToPlot: ['2023'] }))
    expect(data).toHaveLength(1)
  })
})
