export interface Entry {
  date: Date
  score: number | null
}

export interface EntryWithAvg extends Entry {
  rollingAvg: number | null
}

interface RawEntry {
  date: string
  scores?: number[]
}

export function parseJson(raw: RawEntry[]): Entry[] {
  return raw
    .filter(e => Array.isArray(e.scores) && e.scores.length > 0)
    .map(e => ({ date: new Date(e.date), score: e.scores![0] }))
}

export function fillDateGaps(entries: Entry[]): Entry[] {
  if (entries.length === 0) return []

  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime())
  const byDate = new Map(sorted.map(e => [toDateKey(e.date), e.score]))

  const min = sorted[0].date
  const max = sorted[sorted.length - 1].date
  const result: Entry[] = []

  for (const d = new Date(min); d <= max; d.setDate(d.getDate() + 1)) {
    const key = toDateKey(d)
    result.push({ date: new Date(d), score: byDate.get(key) ?? null })
  }

  return result
}

export function rollingAvg(entries: EntryWithAvg[], windowDays: number): EntryWithAvg[] {
  return entries.map((entry, i) => {
    const windowStart = new Date(entry.date)
    windowStart.setDate(windowStart.getDate() - (windowDays - 1))

    const windowScores = entries
      .slice(0, i + 1)
      .filter(e => e.date >= windowStart && e.score !== null)
      .map(e => e.score as number)

    const avg = windowScores.length > 0
      ? windowScores.reduce((sum, s) => sum + s, 0) / windowScores.length
      : null

    return { ...entry, rollingAvg: avg }
  })
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
