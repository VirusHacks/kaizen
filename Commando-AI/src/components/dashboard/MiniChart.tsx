'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface MiniChartProps {
  data: number[]
  color?: string
  height?: number
  className?: string
}

export function MiniChart({ data, color = 'bg-primary', height = 20, className }: MiniChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    
    return data.map((value) => ({
      value,
      percentage: ((value - min) / range) * 100,
    }))
  }, [data])

  if (!chartData || chartData.length === 0) {
    return (
      <div className={cn('flex items-end gap-0.5', className)} style={{ height: `${height}px` }}>
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-muted rounded-t"
            style={{ height: `${Math.random() * 50 + 20}%` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-end gap-0.5', className)} style={{ height: `${height}px` }}>
      {chartData.map((item, index) => (
        <div
          key={index}
          className={cn('w-1 rounded-t transition-all', color)}
          style={{ height: `${Math.max(item.percentage, 10)}%` }}
        />
      ))}
    </div>
  )
}

