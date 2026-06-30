import { useState, useMemo, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { getPixelsStoreUrl } from './utils'
import Plotly from 'plotly.js-dist-min'
import { parseJson, fillDateGaps, rollingAvg, filterByDateRange, toLocalDateString, type EntryWithAvg } from './dataProcessing'
import { buildFigure, type ChartConfig } from './chart'

const WINDOW_PRESETS = [
  { days: 1,  label: 'None' },
  { days: 3,  label: '3d' },
  { days: 7,  label: '1w' },
  { days: 14, label: '2w' },
  { days: 30, label: '1mo' },
  { days: 90, label: '3mo' },
]

const DEFAULT_CONFIG: ChartConfig = {
  windowDays: 7,
  windowLabel: '1w',
  neutralAt: null,
  lineColor: '#6366f1',
  yearsToPlot: [],
  dateRange: { start: null, end: null },
}

const PlotView = forwardRef<HTMLDivElement, { entries: EntryWithAvg[]; config: ChartConfig }>(
  function PlotView({ entries, config }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => containerRef.current!)

    useEffect(() => {
      if (!containerRef.current || config.yearsToPlot.length === 0) return
      const { data, layout } = buildFigure(entries, config)
      Plotly.react(containerRef.current, data, layout, { responsive: true, displayModeBar: false })
    }, [entries, config])

    return (
      <div>
        <div className="text-xs text-gray-400 pl-7">Mood</div>
        <div ref={containerRef} className="w-full" data-testid="plot" />
      </div>
    )
  }
)

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer group">
      <span
        className="w-6 h-6 rounded-full border-2 border-white shadow ring-1 ring-gray-200 flex-shrink-0"
        style={{ background: value }}
      />
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="sr-only" />
      <span className="text-gray-500 group-hover:text-gray-700">{label}</span>
    </label>
  )
}

export default function App() {
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG)
  const [rawEntries, setRawEntries] = useState<EntryWithAvg[] | null>(null)
  const [isSampleData, setIsSampleData] = useState(false)
  const plotRef = useRef<HTMLDivElement>(null)

  const entries = useMemo(() => {
    if (!rawEntries) return null
    const { start, end } = config.dateRange
    return filterByDateRange(rawEntries, start, end)
  }, [rawEntries, config.dateRange.start, config.dateRange.end])

  const availableYears = useMemo(() =>
    [...new Set((entries ?? []).map(e => String(e.date.getFullYear())))].sort(),
    [entries],
  )

  const dataDateRange = useMemo(() => {
    if (!rawEntries || rawEntries.length === 0) return null
    const scored = rawEntries.filter(e => e.score !== null)
    if (scored.length === 0) return null
    const sorted = [...scored].sort((a, b) => a.date.getTime() - b.date.getTime())
    return {
      min: toLocalDateString(sorted[0].date),
      max: toLocalDateString(sorted[sorted.length - 1].date),
    }
  }, [rawEntries])

  // Sync yearsToPlot when available years change (on data load or date range change)
  useEffect(() => {
    setConfig(c => {
      const intersection = c.yearsToPlot.filter(y => availableYears.includes(y))
      return { ...c, yearsToPlot: intersection.length > 0 ? intersection : availableYears }
    })
  }, [availableYears])

  const exportPng = useCallback(() => {
    if (!plotRef.current) return
    Plotly.downloadImage(plotRef.current, {
      format: 'png',
      filename: 'mood',
      width: 1200,
      height: 250 * config.yearsToPlot.length + 60,
    })
  }, [config.yearsToPlot.length])

  const processData = useCallback((raw: unknown[]) => {
    const parsed = parseJson(raw as Parameters<typeof parseJson>[0])
    const filled = fillDateGaps(parsed)
    return rollingAvg(
      filled.map(e => ({ ...e, rollingAvg: null })),
      DEFAULT_CONFIG.windowDays,
    )
  }, [])

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        setRawEntries(processData(raw))
        setConfig(c => ({ ...c, dateRange: { start: null, end: null } }))
        setIsSampleData(false)
      } catch {
        alert('Invalid JSON file.')
      }
    }
    reader.readAsText(file)
  }, [processData])

  const loadSampleData = useCallback(async () => {
    const res = await fetch('./mock_pixels_data.json')
    const raw = await res.json()
    setRawEntries(processData(raw))
    setIsSampleData(true)
  }, [processData])

  // Load sample data on mount
  useEffect(() => { loadSampleData() }, [loadSampleData])

  const updateWindow = useCallback((days: number, label: string) => {
    setConfig(c => ({ ...c, windowDays: days, windowLabel: label }))
    setRawEntries(prev => {
      if (!prev) return prev
      return rollingAvg(prev.map(e => ({ ...e, rollingAvg: null })), days)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <a href="https://github.com/teezeit/pixels" target="_blank" rel="noopener noreferrer"
        className="fixed top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors z-10"
        aria-label="View on GitHub">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
      </a>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold text-gray-900 tracking-tight">
            Your Year in
            <a href={getPixelsStoreUrl()} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
              <img src="https://pixelstracker.app/res/pixels_isologo.svg" alt="Pixels" className="h-8 w-auto" />
            </a>
          </h1>
          <p className="mt-2 text-sm text-gray-400">A companion for the <a href={getPixelsStoreUrl()} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Pixels App</a>.</p>
          <p className="mt-1 text-sm text-gray-500">Visualise your mood data as a rolling average - one chart per year.</p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Load Pixels export
              <input type="file" accept=".json" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
            </label>
            {isSampleData && (
              <span className="text-xs text-gray-400">Showing sample data - load your export to see your own</span>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            To export: Open <a href={getPixelsStoreUrl()} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Pixels</a> → Profile → Export Data → JSON.
          </p>
        </div>

        {/* Config card - accordion */}
        {rawEntries && (
          <details open className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 group">
            <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none select-none">
              <span className="text-sm font-medium text-gray-700">Settings</span>
              <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="flex flex-col gap-5 px-6 pb-5">
              {/* Years */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Years</span>
                <div className="flex flex-wrap gap-2">
                  {availableYears.map(y => {
                    const checked = config.yearsToPlot.includes(y)
                    return (
                      <button key={y} type="button"
                        onClick={() => setConfig(c => ({
                          ...c,
                          yearsToPlot: checked
                            ? c.yearsToPlot.filter(x => x !== y)
                            : [...c.yearsToPlot, y].sort(),
                        }))}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          checked
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'text-gray-500 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {y}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date range */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date range</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={config.dateRange.start ?? ''}
                    min={dataDateRange?.min}
                    max={config.dateRange.end ?? dataDateRange?.max}
                    onChange={e => setConfig(c => ({
                      ...c,
                      dateRange: { ...c.dateRange, start: e.target.value || null },
                    }))}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    value={config.dateRange.end ?? ''}
                    min={config.dateRange.start ?? dataDateRange?.min}
                    max={dataDateRange?.max}
                    onChange={e => setConfig(c => ({
                      ...c,
                      dateRange: { ...c.dateRange, end: e.target.value || null },
                    }))}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                  {(config.dateRange.start || config.dateRange.end) && (
                    <button type="button"
                      onClick={() => setConfig(c => ({ ...c, dateRange: { start: null, end: null } }))}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >Clear</button>
                  )}
                </div>
              </div>

              {/* Smoothing */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Smoothing</span>
                <div className="flex flex-wrap gap-1.5">
                  {WINDOW_PRESETS.map(({ days, label }) => (
                    <button key={days} type="button"
                      onClick={() => updateWindow(days, label)}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        config.windowDays === days
                          ? 'bg-gray-900 text-white border-gray-900'
                          : 'text-gray-500 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Baseline + Color in one row */}
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Baseline</span>
                  <div className="flex rounded-md border border-gray-200 self-start overflow-hidden">
                    {([{ label: '1', value: null }, { label: '3', value: 3 }] as { label: string; value: number | null }[]).map(({ label, value }) => {
                      const active = config.neutralAt === value
                      return (
                        <button key={label} type="button"
                          onClick={() => setConfig(c => ({ ...c, neutralAt: value }))}
                          className={`px-3 py-1 text-sm transition-colors ${
                            active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                          }`}
                        >{label}</button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Color</span>
                  <ColorSwatch value={config.lineColor} label="Line"
                    onChange={v => setConfig(c => ({ ...c, lineColor: v }))} />
                </div>
              </div>
            </div>
          </details>
        )}

        {entries && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-3">
            <div className="flex justify-end mb-2">
              <button type="button" onClick={exportPng}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export PNG
              </button>
            </div>
            <PlotView ref={plotRef} entries={entries} config={config} />
          </div>
        )}
      </div>
    </div>
  )
}
