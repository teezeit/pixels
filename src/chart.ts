import type { Data, Layout } from 'plotly.js-dist-min'
import type { EntryWithAvg } from './dataProcessing'

export interface ChartConfig {
  plotTitle: string
  subplotTitle: string
  windowDays: number
  referenceLine: number
  neutralAt: number | null  // raw score that maps to 0; null = no offset
  markerColor: string
  markerOutlineColor: string
  lineColor: string
  yearsToPlot: string[]
}

export function buildFigure(
  entries: EntryWithAvg[],
  config: ChartConfig
): { data: Data[]; layout: Partial<Layout> } {
  const { plotTitle, subplotTitle, referenceLine, neutralAt, lineColor, yearsToPlot } = config
  const offset = neutralAt ?? 0

  const selectedYears = yearsToPlot.map(Number).sort()
  const numYears = selectedYears.length
  if (numYears === 0) return { data: [], layout: {} }

  // Compute Y range from actual data so it fits snugly
  const allValues = entries
    .filter(e => selectedYears.includes(e.date.getFullYear()) && e.rollingAvg !== null)
    .map(e => e.rollingAvg as number)
  const dataMin = allValues.length ? Math.min(...allValues) : 1
  const dataMax = allValues.length ? Math.max(...allValues) : 5
  const pad = (dataMax - dataMin) * 0.15 || 0.4
  const yMin = Math.max(1, dataMin - pad) - offset
  const yMax = Math.min(5, dataMax + pad) - offset

  // Mean across all selected entries
  const mean = (allValues.length ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 3) - offset

  // Hex → rgba helper for fill
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const fillColor = hexToRgba(lineColor.startsWith('#') ? lineColor : '#6366f1', 0.1)

  const data: Data[] = []

  for (let i = 0; i < numYears; i++) {
    const year = selectedYears[i]
    const yearEntries = entries.filter(e => e.date.getFullYear() === year)

    // Normalise x to year 2000 so all subplots share the same Jan–Dec axis
    const xValues = yearEntries.map(e =>
      new Date(Date.UTC(2000, e.date.getMonth(), e.date.getDate())).toISOString().split('T')[0]
    )
    const yValues = yearEntries.map(e => e.rollingAvg !== null ? e.rollingAvg - offset : null)

    data.push({
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines',
      name: `${year} ${subplotTitle}`,
      xaxis: i === 0 ? 'x' : `x${i + 1}`,
      yaxis: i === 0 ? 'y' : `y${i + 1}`,
      line: { color: lineColor, width: 2, shape: 'spline', smoothing: 0.5 },
      fill: 'tozeroy',
      fillcolor: fillColor,
      connectgaps: false,
    } as Data)
  }

  const shapes: Partial<Layout>['shapes'] = []
  for (let i = 0; i < numYears; i++) {
    const yRef = i === 0 ? 'y' : `y${i + 1}`
    // Mean line — subtle solid
    shapes.push({
      type: 'line', xref: 'paper', yref: yRef as 'y',
      x0: 0, x1: 1, y0: mean, y1: mean,
      line: { color: 'rgba(55,65,81,0.35)', width: 1 },
    })
    // Reference line — dashed, even lighter
    if (referenceLine) {
      shapes.push({
        type: 'line', xref: 'paper', yref: yRef as 'y',
        x0: 0, x1: 1, y0: referenceLine - offset, y1: referenceLine - offset,
        line: { color: 'rgba(156,163,175,0.6)', width: 1, dash: 'dot' },
      })
    }
  }

  // Per-subplot axis config
  const axesConfig: Record<string, object> = {}
  for (let i = 0; i < numYears; i++) {
    const xKey = 'xaxis' + (i === 0 ? '' : i + 1)
    const yKey = 'yaxis' + (i === 0 ? '' : i + 1)
    const yDomain = getYDomain(i, numYears)

    axesConfig[xKey] = {
      anchor: i === 0 ? 'y' : `y${i + 1}`,
      tickformat: '%b',
      showgrid: false,
      showline: false,
      zeroline: false,
      tickfont: { size: 11, color: '#9ca3af' },
      range: ['2000-01-01', '2000-12-31'],
      fixedrange: true,
    }
    axesConfig[yKey] = {
      domain: yDomain,
      anchor: i === 0 ? 'x' : `x${i + 1}`,
      showgrid: true,
      gridcolor: 'rgba(243,244,246,1)',
      gridwidth: 1,
      showline: false,
      zeroline: false,
      tickfont: { size: 11, color: '#9ca3af' },
      range: [yMin, yMax],
      nticks: 4,
      fixedrange: true,
    }
  }

  const annotations = selectedYears.map((year, i) => ({
    text: `${year}`,
    xref: 'paper' as const,
    yref: 'paper' as const,
    x: 0.01,
    xanchor: 'left' as const,
    y: getYDomain(i, numYears)[1],
    yanchor: 'bottom' as const,
    showarrow: false,
    font: { size: 12, color: '#6b7280', family: 'system-ui, sans-serif' },
  }))

  const layout: Partial<Layout> = {
    height: 200 * numYears + 60,
    title: plotTitle
      ? { text: plotTitle, font: { size: 15, color: '#374151', family: 'system-ui, sans-serif' }, x: 0.5 }
      : undefined,
    showlegend: false,
    margin: { l: 40, r: 16, t: plotTitle ? 48 : 16, b: 32 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    shapes,
    annotations,
    ...axesConfig,
  }

  return { data, layout }
}

function getYDomain(index: number, total: number): [number, number] {
  const gap = 0.06
  const slot = 1 / total
  const bottom = 1 - (index + 1) * slot + gap / 2
  const top = 1 - index * slot - gap / 2
  return [Math.max(0, bottom), Math.min(1, top)]
}
