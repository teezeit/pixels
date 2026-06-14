import type { Data, Layout } from 'plotly.js-dist-min'
import type { EntryWithAvg } from './dataProcessing'

export interface ChartConfig {
  plotTitle: string
  subplotTitle: string
  windowDays: number
  referenceLine: number
  markerColor: string
  markerOutlineColor: string
  lineColor: string
  yearsToPlot: string[]
}

export function buildFigure(
  entries: EntryWithAvg[],
  config: ChartConfig
): { data: Data[]; layout: Partial<Layout> } {
  const { plotTitle, subplotTitle, referenceLine, markerColor, markerOutlineColor, lineColor, yearsToPlot } = config

  const selectedYears = yearsToPlot.map(Number).sort()
  const numYears = selectedYears.length
  if (numYears === 0) return { data: [], layout: {} }

  const data: Data[] = []

  for (let i = 0; i < numYears; i++) {
    const year = selectedYears[i]
    const yearEntries = entries.filter(e => e.date.getFullYear() === year)

    // Normalise x to year 2000 so all subplots share the same Jan–Dec axis
    const xValues = yearEntries.map(e =>
      new Date(Date.UTC(2000, e.date.getMonth(), e.date.getDate())).toISOString().split('T')[0]
    )
    const yValues = yearEntries.map(e => e.rollingAvg)

    data.push({
      x: xValues,
      y: yValues,
      type: 'scatter',
      mode: 'lines+markers',
      name: `${year} ${subplotTitle}`,
      xaxis: i === 0 ? 'x' : `x${i + 1}`,
      yaxis: i === 0 ? 'y' : `y${i + 1}`,
      line: { color: lineColor, width: 1.5 },
      marker: {
        size: 4,
        symbol: 'circle',
        color: markerColor,
        line: { width: 1.5, color: markerOutlineColor },
      },
      opacity: 0.9,
      connectgaps: false,
    } as Data)
  }

  // Mean across all selected entries
  const allScores = entries
    .filter(e => selectedYears.includes(e.date.getFullYear()) && e.rollingAvg !== null)
    .map(e => e.rollingAvg as number)
  const mean = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0

  const shapes: Partial<Layout>['shapes'] = []
  for (let i = 0; i < numYears; i++) {
    const yRef = i === 0 ? 'y' : `y${i + 1}`
    shapes.push({
      type: 'line', xref: 'paper', yref: yRef as 'y',
      x0: 0, x1: 1, y0: mean, y1: mean,
      line: { color: '#1f2937', width: 1.5 },
    })
    if (referenceLine) {
      shapes.push({
        type: 'line', xref: 'paper', yref: yRef as 'y',
        x0: 0, x1: 1, y0: referenceLine, y1: referenceLine,
        line: { color: '#6b7280', width: 1, dash: 'dash' },
      })
    }
  }

  // Per-subplot axis config: x-axes span full width, y-axes get vertical domains
  const axesConfig: Record<string, object> = {}
  for (let i = 0; i < numYears; i++) {
    const xKey = 'xaxis' + (i === 0 ? '' : i + 1)
    const yKey = 'yaxis' + (i === 0 ? '' : i + 1)
    const yDomain = getYDomain(i, numYears)

    axesConfig[xKey] = {
      anchor: i === 0 ? 'y' : `y${i + 1}`,
      tickformat: '%b',
      showgrid: true,
      gridcolor: '#f3f4f6',
      range: ['2000-01-01', '2000-12-31'],
      fixedrange: true,
    }
    axesConfig[yKey] = {
      domain: yDomain,
      anchor: i === 0 ? 'x' : `x${i + 1}`,
      title: { text: 'Mood', font: { size: 11 } },
      showgrid: true,
      gridcolor: '#f3f4f6',
      range: [0.75, 5.25],
      tickvals: [1, 2, 3, 4, 5],
      fixedrange: true,
    }
  }

  const annotations = selectedYears.map((year, i) => ({
    text: `<b>${year}</b>`,
    xref: 'paper' as const,
    yref: 'paper' as const,
    x: 0,
    xanchor: 'left' as const,
    y: getYDomain(i, numYears)[1],
    yanchor: 'bottom' as const,
    showarrow: false,
    font: { size: 13, color: '#374151' },
  }))

  const layout: Partial<Layout> = {
    height: 240 * numYears + 60,
    title: { text: plotTitle, font: { size: 18, color: '#111827' }, x: 0.5 },
    showlegend: false,
    margin: { l: 52, r: 24, t: 60, b: 40 },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    shapes,
    annotations,
    ...axesConfig,
  }

  return { data, layout }
}

function getYDomain(index: number, total: number): [number, number] {
  const gap = 0.04
  const slot = 1 / total
  const bottom = 1 - (index + 1) * slot + gap / 2
  const top = 1 - index * slot - gap / 2
  return [Math.max(0, bottom), Math.min(1, top)]
}
