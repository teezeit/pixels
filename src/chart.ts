import type { Data, Layout } from 'plotly.js-dist-min'
import type { EntryWithAvg } from './dataProcessing'

export interface ChartConfig {
  plotTitle: string
  subplotTitle: string
  windowDays: number
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
  const { plotTitle, subplotTitle, neutralAt, lineColor, yearsToPlot } = config
  const offset = neutralAt ?? 0
  const offsetActive = neutralAt !== null

  const selectedYears = yearsToPlot.map(Number).sort()
  const numYears = selectedYears.length
  if (numYears === 0) return { data: [], layout: {} }

  // Per-year values used across data, shapes, and annotations
  const yearValues = selectedYears.map(year =>
    entries
      .filter(e => e.date.getFullYear() === year && e.rollingAvg !== null)
      .map(e => e.rollingAvg as number)
  )

  // When offset is active, y range is fixed at [-2.15, 2.15] so ±2 gridlines are visible
  let yMin: number, yMax: number
  if (offsetActive) {
    yMin = -2.15
    yMax = 2.15
  } else {
    const allValues = yearValues.flat()
    const dataMin = allValues.length ? Math.min(...allValues) : 1
    const dataMax = allValues.length ? Math.max(...allValues) : 5
    const pad = (dataMax - dataMin) * 0.15 || 0.4
    yMin = Math.max(1, dataMin - pad)
    yMax = Math.min(5, dataMax + pad)
  }

  // Per-year mean shifted by offset
  const yearMeans = yearValues.map(vals =>
    (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 3) - offset
  )

  // Hex → rgba helper for fill
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const fillColor = hexToRgba(lineColor.startsWith('#') ? lineColor : '#6366f1', 0.1)

  const data: Data[] = []
  const shapes: Partial<Layout>['shapes'] = []
  const annotations: Partial<Layout>['annotations'] = []
  const axesConfig: Record<string, object> = {}

  for (let i = 0; i < numYears; i++) {
    const year = selectedYears[i]
    const mean = yearMeans[i]
    const meanLabel = (mean >= 0 ? '+' : '') + mean.toFixed(2)
    const yearEntries = entries.filter(e => e.date.getFullYear() === year)
    const yRef = i === 0 ? 'y' : `y${i + 1}`
    const xKey = 'xaxis' + (i === 0 ? '' : i + 1)
    const yKey = 'yaxis' + (i === 0 ? '' : i + 1)
    const yDomain = getYDomain(i, numYears)

    // Trace
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
      yaxis: yRef,
      line: { color: lineColor, width: 2, shape: 'spline', smoothing: 0.5 },
      ...(offset === 0 ? { fill: 'tozeroy' as const, fillcolor: fillColor } : {}),
      connectgaps: false,
    } as Data)

    // Shapes
    shapes.push({
      type: 'line', xref: 'paper', yref: yRef as 'y',
      x0: 0, x1: 1, y0: mean, y1: mean,
      line: { color: 'rgba(245,158,11,0.7)', width: 1.5 },
    })
    if (offsetActive) {
      shapes.push({
        type: 'line', xref: 'paper', yref: yRef as 'y',
        x0: 0, x1: 1, y0: 0, y1: 0,
        line: { color: 'rgba(55,65,81,0.55)', width: 2 },
      })
    }

    // Axes
    axesConfig[xKey] = {
      anchor: yRef,
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
      gridcolor: 'rgba(229,231,235,1)',
      gridwidth: 1,
      showline: false,
      zeroline: false,
      tickfont: { size: 11, color: '#9ca3af' },
      range: [yMin, yMax],
      ...(offsetActive
        ? { tickvals: [-2, -1, 0, 1, 2], ticktext: ['-2', '-1', '0', '1', '2'] }
        : { nticks: 4 }),
      fixedrange: true,
    }

    // Annotations: year label (upper left) + per-year avg (upper right)
    annotations.push({
      text: `${year}`,
      xref: 'paper' as const,
      yref: 'paper' as const,
      x: 0.01,
      xanchor: 'left' as const,
      y: yDomain[1],
      yanchor: 'bottom' as const,
      showarrow: false,
      font: { size: 12, color: '#6b7280', family: 'system-ui, sans-serif' },
    })
    annotations.push({
      text: `avg ${meanLabel}`,
      xref: 'paper' as const,
      yref: 'paper' as const,
      x: 0.99,
      xanchor: 'right' as const,
      y: yDomain[1],
      yanchor: 'bottom' as const,
      showarrow: false,
      font: { size: 10, color: '#f59e0b', family: 'system-ui, sans-serif' },
      bgcolor: 'rgba(255,255,255,0.85)',
      bordercolor: '#fde68a',
      borderwidth: 1,
      borderpad: 3,
    })
  }

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
