'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Users, Flame, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TeamUtilization } from '@/lib/resource-allocation/types'

type Props = {
  utilization: TeamUtilization[]
}

const statusConfig = {
  IDLE: { label: 'Idle', color: 'bg-slate-400', barColor: 'bg-slate-400', dot: 'bg-slate-400', text: 'text-slate-500' },
  NORMAL: { label: 'Normal', color: 'bg-emerald-500', barColor: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-500' },
  BUSY: { label: 'Busy', color: 'bg-amber-500', barColor: 'bg-amber-500', dot: 'bg-amber-500', text: 'text-amber-500' },
  OVERLOADED: { label: 'Overloaded', color: 'bg-red-500', barColor: 'bg-red-500', dot: 'bg-red-500', text: 'text-red-500' },
}

const UtilizationHeatmap = ({ utilization }: Props) => {
  const overloaded = utilization.filter(u => u.status === 'OVERLOADED').length
  const idle = utilization.filter(u => u.status === 'IDLE').length
  const avgUtil = utilization.length > 0
    ? Math.round(utilization.reduce((s, u) => s + u.utilization, 0) / utilization.length)
    : 0

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Team Utilization</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
              avg {avgUtil}%
            </Badge>
            {overloaded > 0 && (
              <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0 text-[10px]">
                {overloaded} overloaded
              </Badge>
            )}
            {idle > 0 && (
              <Badge className="bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-0 text-[10px]">
                {idle} idle
              </Badge>
            )}
          </div>
        </div>

        {utilization.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No team members found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {utilization
              .sort((a, b) => b.utilization - a.utilization)
              .map(member => {
                const cfg = statusConfig[member.status]
                return (
                  <TooltipProvider key={member.userId} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Avatar circle with initial */}
                              <div className={cn(
                                'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                                cfg.color
                              )}>
                                {member.userName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium truncate max-w-[120px]">
                                {member.userName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {member.taskCount} {member.taskCount === 1 ? 'task' : 'tasks'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {member.burnoutRisk > 60 && (
                                <Flame className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
                              )}
                              {member.status === 'OVERLOADED' && (
                                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                              )}
                              <span className={cn('text-xs font-mono font-semibold tabular-nums', cfg.text)}>
                                {member.utilization}%
                              </span>
                            </div>
                          </div>

                          {/* Bar */}
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-700 ease-out',
                                cfg.barColor,
                                member.utilization > 100 && 'animate-pulse'
                              )}
                              style={{ width: `${Math.min(member.utilization, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs space-y-1 max-w-xs">
                        <p className="font-semibold">{member.userName}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-muted-foreground">
                          <span>Utilization</span><span className="font-mono text-right">{member.utilization}%</span>
                          <span>Tasks</span><span className="font-mono text-right">{member.taskCount}</span>
                          <span>Burnout Risk</span><span className="font-mono text-right">{member.burnoutRisk}%</span>
                          <span>Status</span><span className={cn('text-right font-medium', cfg.text)}>{cfg.label}</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}

            {/* Legend */}
            <div className="flex items-center gap-4 pt-3 border-t mt-4">
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                  <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UtilizationHeatmap
