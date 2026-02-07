'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, Clock, ListTodo, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  confidence: number
  totalTasks: number
  doneTasks: number
  inProgressTasks: number
  overdueTasks: number
  activeSprint: {
    id: string
    name: string
    endDate: string | null
    daysRemaining: number | null
  } | null
}

const DeliveryConfidenceCard = ({
  confidence,
  totalTasks,
  doneTasks,
  inProgressTasks,
  overdueTasks,
  activeSprint,
}: Props) => {
  const getColor = (c: number) => {
    if (c >= 80) return { ring: 'stroke-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-500', label: 'On Track', labelColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
    if (c >= 60) return { ring: 'stroke-amber-500', text: 'text-amber-500', bg: 'bg-amber-500', label: 'At Risk', labelColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
    if (c >= 40) return { ring: 'stroke-orange-500', text: 'text-orange-500', bg: 'bg-orange-500', label: 'Needs Attention', labelColor: 'bg-orange-500/10 text-orange-600 border-orange-500/20' }
    return { ring: 'stroke-red-500', text: 'text-red-500', bg: 'bg-red-500', label: 'Critical', labelColor: 'bg-red-500/10 text-red-600 border-red-500/20' }
  }

  const config = getColor(confidence)
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (confidence / 100) * circumference

  return (
    <Card className="overflow-hidden h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Delivery Confidence</h3>
          </div>
          <Badge variant="outline" className={cn('text-[10px] font-semibold border', config.labelColor)}>
            {config.label}
          </Badge>
        </div>

        {/* Circular gauge */}
        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
              <circle
                cx="65"
                cy="65"
                r="54"
                fill="none"
                className="stroke-muted"
                strokeWidth="8"
              />
              <circle
                cx="65"
                cy="65"
                r="54"
                fill="none"
                className={cn(config.ring, 'transition-all duration-1000')}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-bold tabular-nums', config.text)}>
                {confidence}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">percent</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="flex-1 grid grid-cols-2 gap-3">
            <StatItem
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              label="Done"
              value={`${doneTasks}/${totalTasks}`}
            />
            <StatItem
              icon={<ListTodo className="h-3.5 w-3.5 text-blue-500" />}
              label="In Progress"
              value={String(inProgressTasks)}
            />
            <StatItem
              icon={<AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
              label="Overdue"
              value={String(overdueTasks)}
              danger={overdueTasks > 0}
            />
            <StatItem
              icon={<Clock className="h-3.5 w-3.5 text-violet-500" />}
              label="Sprint"
              value={activeSprint?.daysRemaining != null ? `${activeSprint.daysRemaining}d left` : '—'}
            />
          </div>
        </div>

        {/* Sprint info */}
        {activeSprint && (
          <div className="mt-4 pt-3 border-t flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {activeSprint.name}
            </span>
            {activeSprint.endDate && (
              <span className="text-xs text-muted-foreground">
                Ends {new Date(activeSprint.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatItem({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 p-2.5 rounded-lg',
      danger ? 'bg-red-500/5' : 'bg-muted/50'
    )}>
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn('text-sm font-semibold tabular-nums', danger && 'text-red-500')}>{value}</p>
      </div>
    </div>
  )
}

export default DeliveryConfidenceCard
