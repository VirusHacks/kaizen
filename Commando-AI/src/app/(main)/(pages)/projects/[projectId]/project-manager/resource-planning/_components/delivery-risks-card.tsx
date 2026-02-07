'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, ShieldAlert, AlertCircle, Info, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeliveryRisk } from '@/lib/resource-allocation/types'

type Props = {
  risks: DeliveryRisk[]
  projectKey: string
}

const riskConfig = {
  CRITICAL: {
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-500/5 dark:bg-red-500/10',
    border: 'border-red-500/20',
    badgeBg: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  HIGH: {
    icon: AlertTriangle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/5 dark:bg-orange-500/10',
    border: 'border-orange-500/20',
    badgeBg: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
  MEDIUM: {
    icon: AlertCircle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/5 dark:bg-amber-500/10',
    border: 'border-amber-500/20',
    badgeBg: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  LOW: {
    icon: Info,
    color: 'text-blue-500',
    bg: 'bg-blue-500/5 dark:bg-blue-500/10',
    border: 'border-blue-500/20',
    badgeBg: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
}

const DeliveryRisksCard = ({ risks, projectKey }: Props) => {
  const critical = risks.filter(r => r.riskLevel === 'CRITICAL').length
  const high = risks.filter(r => r.riskLevel === 'HIGH').length

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">Delivery Risks</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {critical > 0 && (
              <Badge variant="outline" className="text-[10px] border bg-red-500/10 text-red-600 border-red-500/20">
                {critical} critical
              </Badge>
            )}
            {high > 0 && (
              <Badge variant="outline" className="text-[10px] border bg-orange-500/10 text-orange-600 border-orange-500/20">
                {high} high
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {risks.length} total
            </Badge>
          </div>
        </div>

        {risks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-emerald-600">All Clear</p>
            <p className="text-xs text-muted-foreground mt-1">No significant delivery risks detected</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] -mx-1 px-1">
            <div className="space-y-2">
              {risks.slice(0, 10).map(risk => {
                const cfg = riskConfig[risk.riskLevel]
                const RiskIcon = cfg.icon

                return (
                  <div
                    key={risk.taskId}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      cfg.bg,
                      cfg.border,
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <RiskIcon className={cn('h-4 w-4 mt-0.5 shrink-0', cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {projectKey}-{risk.taskNumber}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px] py-0 h-4 border', cfg.badgeBg)}>
                            {risk.riskLevel}
                          </Badge>
                          {risk.daysUntilDue !== null && (
                            <span className={cn(
                              'text-[10px] ml-auto tabular-nums',
                              risk.daysUntilDue < 0 ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                            )}>
                              {risk.daysUntilDue < 0
                                ? `${Math.abs(risk.daysUntilDue)}d overdue`
                                : `${risk.daysUntilDue}d left`}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1 truncate">{risk.taskTitle}</p>
                        <div className="mt-1.5 space-y-0.5">
                          {risk.reasons.map((reason, i) => (
                            <p key={i} className="text-[11px] text-muted-foreground leading-tight">
                              • {reason}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

export default DeliveryRisksCard
