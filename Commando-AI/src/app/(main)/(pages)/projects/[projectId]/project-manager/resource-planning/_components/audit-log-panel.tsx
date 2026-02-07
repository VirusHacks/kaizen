'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ClipboardList,
  Play,
  Check,
  X,
  Edit3,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getResourceAuditLog } from '../_actions/resource-actions'

type AuditEntry = {
  id: string
  action: string
  actorId: string
  entityType: string
  entityId: string
  details: any
  createdAt: string
}

type Props = {
  projectId: string
}

const actionConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  PLANNING_CYCLE_RUN: { icon: Play, label: 'Planning Cycle', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  RECOMMENDATION_ACCEPTED: { icon: Check, label: 'Accepted', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  RECOMMENDATION_REJECTED: { icon: X, label: 'Rejected', color: 'text-red-500', bg: 'bg-red-500/10' },
  RECOMMENDATION_MODIFIED: { icon: Edit3, label: 'Modified', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  CONFIG_UPDATED: { icon: Settings, label: 'Config Updated', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ALLOCATION_UPDATED: { icon: RefreshCw, label: 'Allocation', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
}

const AuditLogPanel = ({ projectId }: Props) => {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const result = await getResourceAuditLog(projectId)
    if (!result.error) {
      setLogs(result.data)
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group logs by date
  const grouped = logs.reduce<Record<string, AuditEntry[]>>((acc, log) => {
    const date = new Date(log.createdAt).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(log)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center ring-1 ring-cyan-500/20">
            <ClipboardList className="h-4 w-4 text-cyan-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Audit Log</h3>
            <p className="text-xs text-muted-foreground">History of all planning actions</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {logs.length} entries
        </Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground mt-3">Loading audit log...</p>
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No activity recorded</p>
            <p className="text-xs text-muted-foreground mt-1">Actions will appear here as you use the planning system</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[480px] pr-3">
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, entries]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] font-medium text-muted-foreground">{date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-1.5 pl-1">
                  {entries.map(entry => {
                    const cfg = actionConfig[entry.action] || {
                      icon: RefreshCw,
                      label: entry.action,
                      color: 'text-muted-foreground',
                      bg: 'bg-muted',
                    }
                    const Icon = cfg.icon
                    const isExpanded = expanded.has(entry.id)
                    const hasDetails = entry.details && Object.keys(entry.details).length > 0

                    return (
                      <div key={entry.id}>
                        <button
                          onClick={() => hasDetails && toggleExpand(entry.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors',
                            hasDetails && 'hover:bg-muted/50 cursor-pointer',
                            isExpanded && 'bg-muted/40'
                          )}
                        >
                          {/* Timeline dot */}
                          <div className={cn(
                            'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                            cfg.bg
                          )}>
                            <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{cfg.label}</span>
                              {entry.entityType && (
                                <Badge variant="outline" className="text-[9px] py-0 h-3.5">
                                  {entry.entityType}
                                </Badge>
                              )}
                            </div>
                            {entry.entityId && (
                              <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
                                {entry.entityId.slice(0, 8)}...
                              </p>
                            )}
                          </div>

                          {/* Time */}
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                            {new Date(entry.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {/* Expand indicator */}
                          {hasDetails && (
                            isExpanded
                              ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                              : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </button>

                        {/* Expanded details */}
                        {isExpanded && hasDetails && (
                          <div className="ml-10 mt-1 mb-2 p-3 bg-muted/30 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-150">
                            <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap break-all leading-relaxed">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

export default AuditLogPanel
