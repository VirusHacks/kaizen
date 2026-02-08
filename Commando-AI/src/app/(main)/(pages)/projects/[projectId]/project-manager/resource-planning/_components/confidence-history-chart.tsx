'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  history: {
    date: string
    confidence: number
  }[]
}

const ConfidenceHistoryChart = ({ history }: Props) => {
  if (history.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Confidence Trend</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No history yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run planning cycles to build trend data</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxVal = 100
  const chartHeight = 200
  const data = history.slice(-14)

  // Trend calculation
  const latest = data[data.length - 1]?.confidence ?? 0
  const previous = data.length >= 2 ? data[data.length - 2].confidence : latest
  const trendDelta = latest - previous
  const overallTrend = data.length >= 3
    ? latest - data[0].confidence
    : trendDelta

  // SVG line chart
  const width = 500
  const height = 160
  const padding = { top: 10, right: 10, bottom: 30, left: 5 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = data.map((d, i) => ({
    x: padding.left + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding.top + (1 - d.confidence / maxVal) * chartH,
    confidence: d.confidence,
    date: d.date,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`

  const getColor = (c: number) => {
    if (c >= 80) return '#10b981'
    if (c >= 60) return '#f59e0b'
    if (c >= 40) return '#f97316'
    return '#ef4444'
  }

  const lineColor = getColor(latest)

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Confidence Trend</h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Current value */}
            <span className="text-lg font-bold tabular-nums" style={{ color: lineColor }}>
              {latest}%
            </span>

            {/* Trend indicator */}
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
              overallTrend > 0 && 'bg-emerald-500/10 text-emerald-600',
              overallTrend < 0 && 'bg-red-500/10 text-red-600',
              overallTrend === 0 && 'bg-muted text-muted-foreground',
            )}>
              {overallTrend > 0 ? <TrendingUp className="h-3 w-3" /> :
               overallTrend < 0 ? <TrendingDown className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              {overallTrend > 0 ? '+' : ''}{overallTrend}%
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="w-full">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(val => {
              const y = padding.top + (1 - val / maxVal) * chartH
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    x2={padding.left + chartW}
                    y1={y}
                    y2={y}
                    className="stroke-muted"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left + chartW + 5}
                    y={y + 3}
                    className="fill-muted-foreground"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              )
            })}

            {/* Gradient area fill */}
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#confidenceGradient)" />

            {/* Main line */}
            <path
              d={linePath}
              fill="none"
              stroke={lineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="var(--background)"
                  stroke={lineColor}
                  strokeWidth="2"
                />
                {/* Date labels (show every 2-3) */}
                {(i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 5) === 0) && (
                  <text
                    x={p.x}
                    y={padding.top + chartH + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="8"
                  >
                    {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* Summary bar */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
          <span>First: {data[0]?.confidence}%</span>
          <span>High: {Math.max(...data.map(d => d.confidence))}%</span>
          <span>Low: {Math.min(...data.map(d => d.confidence))}%</span>
          <span>Latest: {latest}%</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConfidenceHistoryChart
