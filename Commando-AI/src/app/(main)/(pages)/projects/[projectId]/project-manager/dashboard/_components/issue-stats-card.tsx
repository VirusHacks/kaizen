'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  ListTodo,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  CircleDot,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IssueStatus, IssuePriority } from '@prisma/client'

type Props = {
  projectId: string
  stats: {
    total: number
    byStatus: Record<IssueStatus, number>
    byPriority: Record<IssuePriority, number>
    overdue: number
  }
}

const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; bgColor: string }> = {
  TODO: { label: 'To Do', color: 'text-gray-500', bgColor: 'bg-gray-500' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  IN_REVIEW: { label: 'In Review', color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  DONE: { label: 'Done', color: 'text-green-500', bgColor: 'bg-green-500' },
}

const PRIORITY_CONFIG: Record<IssuePriority, { label: string; icon: React.ElementType; color: string }> = {
  CRITICAL: { label: 'Critical', icon: AlertCircle, color: 'text-red-500' },
  HIGH: { label: 'High', icon: ArrowUp, color: 'text-orange-500' },
  MEDIUM: { label: 'Medium', icon: Minus, color: 'text-yellow-500' },
  LOW: { label: 'Low', icon: ArrowDown, color: 'text-gray-500' },
}

const IssueStatsCard = ({ projectId, stats }: Props) => {
  const completionRate = stats.total > 0 
    ? Math.round((stats.byStatus.DONE / stats.total) * 100) 
    : 0

  return (
    <Card className="col-span-full md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Issue Statistics
        </CardTitle>
        <Link href={`/projects/${projectId}/issues`}>
          <Button variant="ghost" size="sm" className="gap-1">
            View All
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total and Completion */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Issues</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-500">{completionRate}%</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="space-y-2">
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
            {(Object.keys(STATUS_CONFIG) as IssueStatus[]).map((status) => {
              const config = STATUS_CONFIG[status]
              const percentage = stats.total > 0 
                ? (stats.byStatus[status] / stats.total) * 100 
                : 0
              if (percentage === 0) return null
              return (
                <div
                  key={status}
                  className={cn("h-full", config.bgColor)}
                  style={{ width: `${percentage}%` }}
                />
              )
            })}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(STATUS_CONFIG) as IssueStatus[]).map((status) => {
              const config = STATUS_CONFIG[status]
              return (
                <div key={status} className="text-center">
                  <p className={cn("text-lg font-semibold", config.color)}>
                    {stats.byStatus[status]}
                  </p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Priority and Overdue */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-3">
            {(Object.keys(PRIORITY_CONFIG) as IssuePriority[]).map((priority) => {
              const config = PRIORITY_CONFIG[priority]
              const count = stats.byPriority[priority]
              if (count === 0) return null
              return (
                <div key={priority} className="flex items-center gap-1">
                  <config.icon className={cn("h-3 w-3", config.color)} />
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </div>
          {stats.overdue > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdue} Overdue
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default IssueStatsCard
