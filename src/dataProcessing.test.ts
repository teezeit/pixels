import { describe, it, expect } from 'vitest'
import { parseJson, fillDateGaps, rollingAvg } from './dataProcessing'

// --- parseJson ---

describe('parseJson', () => {
  it('parses valid entries using scores[0]', () => {
    const input = [
      { date: '2024-01-01', scores: [4] },
      { date: '2024-01-02', scores: [3] },
    ]
    const result = parseJson(input)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: new Date('2024-01-01'), score: 4 })
    expect(result[1]).toEqual({ date: new Date('2024-01-02'), score: 3 })
  })

  it('skips entries with missing or empty scores array', () => {
    const input = [
      { date: '2024-01-01', scores: [] },
      { date: '2024-01-02', scores: [2] },
      { date: '2024-01-03' },
    ]
    const result = parseJson(input)
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(2)
  })
})

  it('returns empty array for empty input', () => {
    expect(parseJson([])).toHaveLength(0)
  })

// --- fillDateGaps ---

describe('fillDateGaps', () => {
  it('inserts null-score entries for missing days', () => {
    const entries = [
      { date: new Date('2024-01-01'), score: 4 },
      { date: new Date('2024-01-03'), score: 3 },
    ]
    const result = fillDateGaps(entries)
    expect(result).toHaveLength(3)
    expect(result[1].date).toEqual(new Date('2024-01-02'))
    expect(result[1].score).toBeNull()
  })

  it('returns entries sorted by date', () => {
    const entries = [
      { date: new Date('2024-01-03'), score: 5 },
      { date: new Date('2024-01-01'), score: 3 },
    ]
    const result = fillDateGaps(entries)
    expect(result[0].date).toEqual(new Date('2024-01-01'))
    expect(result[2].date).toEqual(new Date('2024-01-03'))
  })

  it('leaves a contiguous series unchanged', () => {
    const entries = [
      { date: new Date('2024-01-01'), score: 1 },
      { date: new Date('2024-01-02'), score: 2 },
      { date: new Date('2024-01-03'), score: 3 },
    ]
    const result = fillDateGaps(entries)
    expect(result).toHaveLength(3)
    expect(result.every(e => e.score !== null)).toBe(true)
  })
})

  it('returns empty array for empty input', () => {
    expect(fillDateGaps([])).toHaveLength(0)
  })

// --- rollingAvg ---

describe('rollingAvg', () => {
  it('calculates 7-day rolling averages on a contiguous series', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(2024, 0, i + 1),
      score: i + 1 as number | null,
      rollingAvg: null as number | null,
    }))
    const result = rollingAvg(entries, 7)
    // Day 1: only 1 entry in window → avg = 1
    expect(result[0].rollingAvg).toBeCloseTo(1)
    // Day 7: entries 1-7 → avg = 4
    expect(result[6].rollingAvg).toBeCloseTo(4)
    // Day 10: entries 4-10 → avg = 7
    expect(result[9].rollingAvg).toBeCloseTo(7)
  })

  it('excludes null-score days from the window average', () => {
    const entries = [
      { date: new Date('2024-01-01'), score: 4 as number | null, rollingAvg: null as number | null },
      { date: new Date('2024-01-02'), score: null, rollingAvg: null as number | null },
      { date: new Date('2024-01-03'), score: 2 as number | null, rollingAvg: null as number | null },
    ]
    const result = rollingAvg(entries, 7)
    // day 3: only scores 4 and 2 count → avg = 3
    expect(result[2].rollingAvg).toBeCloseTo(3)
  })

  it('handles window larger than total entries (min_periods=1)', () => {
    const entries = [
      { date: new Date('2024-01-01'), score: 5 as number | null, rollingAvg: null as number | null },
    ]
    const result = rollingAvg(entries, 30)
    expect(result[0].rollingAvg).toBeCloseTo(5)
  })

  it('single entry returns its own score as the average', () => {
    const entries = [
      { date: new Date('2024-01-01'), score: 3 as number | null, rollingAvg: null as number | null },
    ]
    const result = rollingAvg(entries, 7)
    expect(result[0].rollingAvg).toBe(3)
  })

  it('returns null avg for entries with all null scores', () => {
    const entries = [
      { date: new Date('2024-01-01'), score: null as number | null, rollingAvg: null as number | null },
      { date: new Date('2024-01-02'), score: null as number | null, rollingAvg: null as number | null },
    ]
    const result = rollingAvg(entries, 7)
    expect(result[0].rollingAvg).toBeNull()
    expect(result[1].rollingAvg).toBeNull()
  })
})
