'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ResourcePlanningData } from '@/lib/resource-allocation/types'

type Props = {
  data: ResourcePlanningData
}

const ExecutiveDashboardClient = ({ data }: Props) => {
  const { state, utilization, recommendations } = data
  const totalTasks = state.tasks.length
  const doneTasks = state.tasks.filter(t => t.status === 'DONE').length
  const inProgress = state.tasks.filter(t => t.status === 'IN_PROGRESS').length
  const overloaded = utilization.filter(u => u.status === 'OVERLOADED').length
  const avgUtilization = utilization.length > 0
    ? Math.round(utilization.reduce((sum, u) => sum + u.utilization, 0) / utilization.length)
    : 0
  const criticalRisks = state.risks.filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length
  const pendingRecs = recommendations.filter(r => r.status === 'PENDING').length

  const getConfidenceColor = (c: number) => {
    if (c >= 80) return 'text-green-500'
    if (c >= 60) return 'text-yellow-500'
    if (c >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Key Metrics Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivery Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold', getConfidenceColor(state.deliveryConfidence))}>
              {state.deliveryConfidence}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {state.deliveryConfidence >= 80 ? 'On track' : state.deliveryConfidence >= 60 ? 'At risk' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{doneTasks}/{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}% complete · {inProgress} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team Utilization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgUtilization}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {utilization.length} members · {overloaded} overloaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Risks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold', criticalRisks > 0 ? 'text-red-500' : 'text-green-500')}>
              {criticalRisks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {state.risks.length} total risks · {pendingRecs} pending recommendations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Confidence Over Time */}
      {data.deliveryConfidenceHistory.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Delivery Confidence Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-[150px]">
              {data.deliveryConfidenceHistory.slice(-20).map((point, i) => {
                const height = (point.confidence / 100) * 150
                const getColor = (c: number) => {
                  if (c >= 80) return 'bg-green-500'
                  if (c >= 60) return 'bg-yellow-500'
                  if (c >= 40) return 'bg-orange-500'
                  return 'bg-red-500'
                }
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{point.confidence}%</span>
                    <div
                      className={cn('w-full rounded-t', getColor(point.confidence))}
                      style={{ height: `${height}px` }}
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost vs Speed Tradeoff Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Speed vs Cost Tradeoff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sprint Progress</span>
                <span className="text-sm font-medium">
                  {state.activeSprint?.daysRemaining != null
                    ? `${state.activeSprint.daysRemaining} days remaining`
                    : 'No active sprint'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg Team Utilization</span>
                <span className="text-sm font-medium">{avgUtilization}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overwork Risk</span>
                <span className={cn(
                  'text-sm font-medium',
                  overloaded > 0 ? 'text-red-500' : 'text-green-500'
                )}>
                  {overloaded > 0 ? `${overloaded} members at risk` : 'All clear'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending Optimizations</span>
                <Badge variant={pendingRecs > 0 ? 'default' : 'secondary'}>
                  {pendingRecs} recommendations
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Risks for execs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Critical Delivery Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.risks.filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No critical risks at this time.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {state.risks
                  .filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH')
                  .slice(0, 5)
                  .map(risk => (
                    <div key={risk.taskId} className="flex items-center gap-2 p-2 rounded border">
                      <Badge variant={risk.riskLevel === 'CRITICAL' ? 'destructive' : 'default'} className="text-xs">
                        {risk.riskLevel}
                      </Badge>
                      <span className="text-sm truncate flex-1">{risk.taskTitle}</span>
                      {risk.daysUntilDue !== null && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {risk.daysUntilDue < 0 ? `${Math.abs(risk.daysUntilDue)}d late` : `${risk.daysUntilDue}d`}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ExecutiveDashboardClient
