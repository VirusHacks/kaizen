'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMemo } from 'react'

interface FileTypeData {
  type: string
  count: number
  color: string
  percentage: number
}

interface FileTypesChartProps {
  fileTypes: Record<string, number>
}

const COLORS = [
  { name: 'Folder', color: 'hsl(217, 91%, 60%)' }, // Blue
  { name: 'Document', color: 'hsl(142, 76%, 36%)' }, // Green
  { name: 'Image', color: 'hsl(38, 92%, 50%)' }, // Orange
  { name: 'Other', color: 'hsl(280, 100%, 70%)' }, // Purple
  { name: 'PDF', color: 'hsl(0, 84%, 60%)' }, // Red
  { name: 'Spreadsheet', color: 'hsl(142, 76%, 36%)' }, // Green
]

export function FileTypesChart({ fileTypes }: FileTypesChartProps) {
  const chartData = useMemo(() => {
    const total = Object.values(fileTypes).reduce((sum, count) => sum + count, 0)
    if (total === 0) return []

    const data: FileTypeData[] = []
    let currentAngle = 0

    Object.entries(fileTypes).forEach(([type, count]) => {
      const percentage = (count / total) * 100
      const colorObj = COLORS.find(c => c.name === type) || COLORS[COLORS.length - 1]
      
      data.push({
        type,
        count,
        color: colorObj.color,
        percentage,
      })
    })

    return data.sort((a, b) => b.count - a.count)
  }, [fileTypes])

  const total = Object.values(fileTypes).reduce((sum, count) => sum + count, 0)

  if (total === 0 || chartData.length === 0) {
    return null
  }

  // Calculate SVG path for donut chart
  const radius = 40
  const innerRadius = 25
  const centerX = 50
  const centerY = 50
  let currentAngle = -90 // Start at top

  const paths = chartData.map((item) => {
    const angle = (item.percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    const startAngleRad = (startAngle * Math.PI) / 180
    const endAngleRad = (endAngle * Math.PI) / 180

    const x1 = centerX + radius * Math.cos(startAngleRad)
    const y1 = centerY + radius * Math.sin(startAngleRad)
    const x2 = centerX + radius * Math.cos(endAngleRad)
    const y2 = centerY + radius * Math.sin(endAngleRad)

    const x1Inner = centerX + innerRadius * Math.cos(startAngleRad)
    const y1Inner = centerY + innerRadius * Math.sin(startAngleRad)
    const x2Inner = centerX + innerRadius * Math.cos(endAngleRad)
    const y2Inner = centerY + innerRadius * Math.sin(endAngleRad)

    const largeArcFlag = angle > 180 ? 1 : 0

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x2Inner} ${y2Inner}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
      'Z',
    ].join(' ')

    return { pathData, color: item.color, type: item.type, percentage: item.percentage, count: item.count }
  })

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-4">
        <CardTitle className="text-base">File Types Distribution</CardTitle>
        <CardDescription className="text-sm mt-0.5">Breakdown by type</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0 px-4 pb-3">
        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-28 h-28">
              {paths.map((path, index) => (
                <path
                  key={index}
                  d={path.pathData}
                  fill={path.color}
                  stroke="hsl(var(--background))"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {chartData.map((item, index) => (
              <div key={item.type} className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{item.type}</span>
                  <span className="text-sm font-medium">{Math.round(item.percentage)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

