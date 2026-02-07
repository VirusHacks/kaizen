'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  Users,
  TrendingDown,
  TrendingUp,
  Flame,
  Heart,
  AlertTriangle,
  Clock,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ResourcePlanningData } from '@/lib/resource-allocation/types'

type Props = {
  data: ResourcePlanningData
}

const FinanceDashboardClient = ({ data }: Props) => {
  const { state, utilization } = data
  const avgBurnout = utilization.length > 0
    ? Math.round(utilization.reduce((sum, u) => sum + u.burnoutRisk, 0) / utilization.length)
    : 0
  const overloaded = utilization.filter(u => u.status === 'OVERLOADED')
  const idle = utilization.filter(u => u.status === 'IDLE')
  const avgUtilization = utilization.length > 0
    ? Math.round(utilization.reduce((sum, u) => sum + u.utilization, 0) / utilization.length)
    : 0

  // Cost analysis from team data
  const teamCosts = state.team.map(m => ({
    name: m.userName,
    costRate: m.costRate,
    allocatedHours: m.allocatedHours,
    estimatedCost: m.costRate * m.allocatedHours,
    utilization: m.utilizationPercent,
    burnoutRisk: m.burnoutRisk,
  }))

  const totalEstimatedCost = teamCosts.reduce((sum, t) => sum + t.estimatedCost, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Key Financial Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Est. Sprint Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${totalEstimatedCost > 0 ? totalEstimatedCost.toLocaleString() : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on team hourly rates × allocated hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-3xl font-bold',
              avgUtilization >= 60 && avgUtilization <= 85 ? 'text-green-500' : 'text-orange-500'
            )}>
              {avgUtilization}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgUtilization >= 60 && avgUtilization <= 85 ? 'Optimal range' : 'Outside optimal 60-85%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Burnout Risk</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-3xl font-bold',
              avgBurnout < 30 ? 'text-green-500' : avgBurnout < 60 ? 'text-yellow-500' : 'text-red-500'
            )}>
              {avgBurnout}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg across {utilization.length} team members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Capacity Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {overloaded.length + idle.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overloaded.length} overloaded · {idle.length} idle
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Cost & Burnout Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Efficiency by Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamCosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No team data available</p>
            ) : (
              <div className="space-y-3">
                {teamCosts
                  .sort((a, b) => b.estimatedCost - a.estimatedCost)
                  .map(member => (
                    <div key={member.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate max-w-[200px]">{member.name}</span>
                        <div className="flex items-center gap-2">
                          {member.costRate > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ${member.costRate}/hr
                            </span>
                          )}
                          <span className="text-sm font-mono">
                            ${member.estimatedCost.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            member.utilization > 100 ? 'bg-red-500' :
                            member.utilization > 85 ? 'bg-yellow-500' :
                            member.utilization < 30 ? 'bg-gray-400' : 'bg-green-500'
                          )}
                          style={{ width: `${Math.min(member.utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Burnout Risk Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            {utilization.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No team data available</p>
            ) : (
              <div className="space-y-3">
                {utilization
                  .sort((a, b) => b.burnoutRisk - a.burnoutRisk)
                  .map(member => {
                    const getBurnoutColor = (risk: number) => {
                      if (risk >= 70) return 'bg-red-500'
                      if (risk >= 40) return 'bg-orange-500'
                      if (risk >= 20) return 'bg-yellow-500'
                      return 'bg-green-500'
                    }

                    return (
                      <div key={member.userId} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate max-w-[200px]">{member.userName}</span>
                            {member.burnoutRisk >= 70 && (
                              <Badge variant="destructive" className="text-xs">At Risk</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Flame className={cn(
                              'h-3.5 w-3.5',
                              member.burnoutRisk >= 70 ? 'text-red-500' :
                              member.burnoutRisk >= 40 ? 'text-orange-500' : 'text-green-500'
                            )} />
                            <span className="text-sm font-mono">{member.burnoutRisk}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', getBurnoutColor(member.burnoutRisk))}
                            style={{ width: `${member.burnoutRisk}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overloaded Members Alert */}
      {overloaded.length > 0 && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-500">
              <AlertTriangle className="h-4 w-4" />
              Overloaded Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {overloaded.map(member => (
                <div key={member.userId} className="p-3 rounded-lg border bg-background">
                  <div className="font-medium text-sm">{member.userName}</div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{member.utilization}% utilized</span>
                    <span>{member.taskCount} tasks</span>
                    <span className={cn(member.burnoutRisk >= 70 ? 'text-red-500' : '')}>
                      {member.burnoutRisk}% burnout risk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default FinanceDashboardClient
