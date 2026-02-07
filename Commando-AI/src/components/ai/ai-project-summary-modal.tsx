'use client'

import React, { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Target,
  CheckCircle2,
  Clock,
  Users,
  BarChart3,
  FileText,
  Lightbulb,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIProjectSummary, AIKeyMetric, AIRisk, AIBlocker, AIRecommendation, AIWeeklyHighlight } from '@/lib/ai/ai.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  onFetchSummary: () => Promise<AIProjectSummary | null>
}

function MetricCard({ metric }: { metric: AIKeyMetric }) {
  const getTrendIcon = () => {
    switch (metric.trend) {
      case 'UP':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'DOWN':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{metric.name}</span>
        {getTrendIcon()}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{metric.value}</span>
        {metric.change && (
          <span
            className={cn(
              'text-xs font-medium',
              metric.trend === 'UP' && 'text-green-500',
              metric.trend === 'DOWN' && 'text-red-500',
              metric.trend === 'STABLE' && 'text-muted-foreground'
            )}
          >
            {metric.change}
          </span>
        )}
      </div>
    </div>
  )
}

function RiskItem({ risk }: { risk: AIRisk }) {
  const severityColors: Record<string, string> = {
    CRITICAL: 'border-red-500 bg-red-500/10 text-red-500',
    HIGH: 'border-orange-500 bg-orange-500/10 text-orange-500',
    MEDIUM: 'border-yellow-500 bg-yellow-500/10 text-yellow-500',
    LOW: 'border-gray-500 bg-gray-500/10 text-gray-500',
  }

  return (
    <div className={cn('p-3 rounded-lg border-l-4', severityColors[risk.severity] || '')}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium text-sm text-foreground">{risk.title}</span>
        <Badge variant="outline" className="text-xs ml-auto">
          {risk.severity}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>
      {risk.mitigation && (
        <p className="text-xs">
          <span className="font-medium">Mitigation: </span>
          {risk.mitigation}
        </p>
      )}
    </div>
  )
}

function BlockerItem({ blocker }: { blocker: AIBlocker }) {
  return (
    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{blocker.issueKey}</span>
            <span className="text-xs text-muted-foreground">{blocker.title}</span>
          </div>
          <p className="text-xs text-muted-foreground">{blocker.reason}</p>
          {blocker.suggestedAction && (
            <p className="text-xs text-primary mt-1">
              <span className="font-medium">Suggested: </span>
              {blocker.suggestedAction}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function RecommendationItem({ rec, index }: { rec: AIRecommendation; index: number }) {
  const priorityColors: Record<string, string> = {
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    LOW: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  }

  return (
    <div className={cn('p-3 rounded-lg border', priorityColors[rec.priority] || '')}>
      <div className="flex items-start gap-3">
        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">{index + 1}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-foreground">{rec.title}</span>
            <Badge variant="outline" className="text-xs">
              {rec.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{rec.description}</p>
          {rec.expectedImpact && (
            <p className="text-xs text-green-500 mt-1">
              Impact: {rec.expectedImpact}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function WeeklyHighlightItem({ highlight }: { highlight: AIWeeklyHighlight }) {
  const typeIcons: Record<string, React.ElementType> = {
    ACHIEVEMENT: CheckCircle2,
    MILESTONE: Target,
    CONCERN: AlertTriangle,
    UPDATE: Activity,
  }
  const Icon = typeIcons[highlight.type] || Activity

  const typeColors: Record<string, string> = {
    ACHIEVEMENT: 'text-green-500',
    MILESTONE: 'text-blue-500',
    CONCERN: 'text-yellow-500',
    UPDATE: 'text-muted-foreground',
  }

  return (
    <div className="flex items-start gap-2">
      <Icon className={cn('h-4 w-4 flex-shrink-0 mt-0.5', typeColors[highlight.type])} />
      <span className="text-sm">{highlight.description}</span>
    </div>
  )
}

export function AIProjectSummaryModal({
  open,
  onOpenChange,
  projectId,
  projectName,
  onFetchSummary,
}: Props) {
  const [summary, setSummary] = useState<AIProjectSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFetching, startFetching] = useTransition()

  useEffect(() => {
    if (open && !summary && !isFetching) {
      handleFetch()
    }
  }, [open])

  const handleFetch = () => {
    setError(null)
    setSummary(null)

    startFetching(async () => {
      try {
        const result = await onFetchSummary()
        if (result) {
          setSummary(result)
        } else {
          setError('Failed to generate summary. Please try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setSummary(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Project Summary
          </DialogTitle>
          <DialogDescription>
            AI-generated insights and analysis for{' '}
            <span className="font-medium text-foreground">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {/* Loading state */}
          {isFetching && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing project data and generating insights...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !isFetching && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleFetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}

          {/* Summary content */}
          {summary && !isFetching && (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {/* Executive Summary */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Executive Summary
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {summary.summary}
                  </p>
                </div>

                {/* Progress Narrative */}
                {summary.progressNarrative && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Progress Overview
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {summary.progressNarrative}
                    </p>
                  </div>
                )}

                {/* Key Metrics */}
                {summary.keyMetrics && summary.keyMetrics.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Key Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {summary.keyMetrics.map((metric, i) => (
                        <MetricCard key={i} metric={metric} />
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Weekly Highlights */}
                {summary.weeklyHighlights && summary.weeklyHighlights.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      This Week's Highlights
                    </h3>
                    <div className="space-y-2">
                      {summary.weeklyHighlights.map((highlight, i) => (
                        <WeeklyHighlightItem key={i} highlight={highlight} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Blockers */}
                {summary.blockers && summary.blockers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-500">
                      <AlertCircle className="h-4 w-4" />
                      Active Blockers
                      <Badge variant="destructive" className="text-xs">
                        {summary.blockers.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {summary.blockers.map((blocker, i) => (
                        <BlockerItem key={i} blocker={blocker} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {summary.risks && summary.risks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Identified Risks
                    </h3>
                    <div className="space-y-2">
                      {summary.risks.map((risk, i) => (
                        <RiskItem key={i} risk={risk} />
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Recommendations */}
                {summary.recommendations && summary.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      AI Recommendations
                    </h3>
                    <div className="space-y-2">
                      {summary.recommendations.map((rec, i) => (
                        <RecommendationItem key={i} rec={rec} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regenerate */}
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFetch}
                    disabled={isFetching}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Regenerate Summary
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AIProjectSummaryModal
