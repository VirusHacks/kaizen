'use client'

import React, { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Lightbulb,
  Check,
  X,
  ArrowRightLeft,
  Clock,
  Split,
  UserPlus,
  TrendingUp,
  DollarSign,
  Flame,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { handleRecommendationDecision } from '../_actions/resource-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type RecommendationItem = {
  id: string
  type: string
  status: string
  title: string
  description: string
  reason: string
  actionPayload: any
  deliveryProbabilityChange: number
  costImpactPercent: number
  burnoutRiskChange: number
  impactScore: number
  createdAt: string
  decidedBy: string | null
  decidedAt: string | null
}

type Props = {
  recommendations: RecommendationItem[]
  projectId: string
  compact?: boolean
}

const typeConfig: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  REASSIGN_TASK: { icon: ArrowRightLeft, label: 'Reassign', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  DELAY_TASK: { icon: Clock, label: 'Delay', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  SPLIT_TASK: { icon: Split, label: 'Split', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ADD_REVIEWER: { icon: UserPlus, label: 'Add Reviewer', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  SUGGEST_EXTERNAL: { icon: UserPlus, label: 'External', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  REBALANCE_WORKLOAD: { icon: ArrowRightLeft, label: 'Rebalance', color: 'text-violet-500', bg: 'bg-violet-500/10' },
}

const RecommendationsPanel = ({ recommendations, projectId, compact = false }: Props) => {
  const [showDecided, setShowDecided] = useState(false)
  const pending = recommendations.filter(r => r.status === 'PENDING')
  const decided = recommendations.filter(r => r.status !== 'PENDING')

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center ring-1 ring-violet-500/20">
              <Sparkles className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">AI Recommendations</h3>
              <p className="text-xs text-muted-foreground">Review and act on system suggestions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 border-0 text-[10px]">
              {pending.length} pending
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {decided.length} decided
            </Badge>
          </div>
        </div>
      )}

      {pending.length === 0 && decided.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run a planning cycle to generate AI recommendations</p>
          </CardContent>
        </Card>
      )}

      {/* Pending */}
      <div className="space-y-3">
        {pending.map(rec => (
          <RecommendationCard key={rec.id} rec={rec} projectId={projectId} />
        ))}
      </div>

      {/* Decided (collapsible) */}
      {!compact && decided.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowDecided(!showDecided)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            {showDecided ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showDecided ? 'Hide' : 'Show'} {decided.length} decided recommendation{decided.length !== 1 ? 's' : ''}
          </button>
          {showDecided && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {decided.map(rec => {
                const cfg = typeConfig[rec.type] || typeConfig.REASSIGN_TASK
                return (
                  <div key={rec.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <Badge
                      className={cn(
                        'text-[10px] border-0 shrink-0',
                        rec.status === 'ACCEPTED' && 'bg-emerald-500/10 text-emerald-600',
                        rec.status === 'REJECTED' && 'bg-red-500/10 text-red-600',
                        rec.status === 'MODIFIED' && 'bg-amber-500/10 text-amber-600',
                      )}
                    >
                      {rec.status}
                    </Badge>
                    <span className="text-xs truncate flex-1">{rec.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                      {rec.decidedAt && new Date(rec.decidedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RecommendationCard({ rec, projectId }: { rec: RecommendationItem; projectId: string }) {
  const [isPending, startTransition] = useTransition()
  const [rejectionReason, setRejectionReason] = useState('')
  const router = useRouter()
  const cfg = typeConfig[rec.type] || typeConfig.REASSIGN_TASK
  const TypeIcon = cfg.icon

  const handleDecision = (decision: 'ACCEPTED' | 'REJECTED' | 'MODIFIED') => {
    startTransition(async () => {
      const result = await handleRecommendationDecision(
        rec.id,
        decision,
        decision === 'REJECTED' ? rejectionReason : undefined
      )
      if (result.success) {
        toast.success(`Recommendation ${decision.toLowerCase()}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Action failed')
      }
    })
  }

  return (
    <Card className={cn(
      'overflow-hidden transition-shadow hover:shadow-md',
      'border-l-[3px]',
      rec.type === 'REASSIGN_TASK' && 'border-l-blue-500',
      rec.type === 'DELAY_TASK' && 'border-l-amber-500',
      rec.type === 'ADD_REVIEWER' && 'border-l-emerald-500',
      rec.type === 'REBALANCE_WORKLOAD' && 'border-l-violet-500',
      rec.type === 'SPLIT_TASK' && 'border-l-purple-500',
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg)}>
            <TypeIcon className={cn('h-4 w-4', cfg.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className={cn('text-[10px] py-0 h-4 border-0', cfg.bg, cfg.color)}>
                {cfg.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                Score {rec.impactScore.toFixed(1)}
              </span>
            </div>
            <h4 className="text-sm font-semibold leading-snug">{rec.title}</h4>
          </div>
        </div>

        {/* Description */}
        <div className="pl-11 space-y-1">
          <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
          <p className="text-[11px] text-muted-foreground/80 italic">💡 {rec.reason}</p>
        </div>

        {/* Impact metrics */}
        <div className="pl-11 flex items-center gap-2">
          <ImpactPill
            icon={<TrendingUp className="h-3 w-3" />}
            label="Delivery"
            value={rec.deliveryProbabilityChange}
            positive={rec.deliveryProbabilityChange >= 0}
            suffix="%"
          />
          <ImpactPill
            icon={<DollarSign className="h-3 w-3" />}
            label="Cost"
            value={rec.costImpactPercent}
            positive={rec.costImpactPercent <= 0}
            suffix="%"
            invert
          />
          <ImpactPill
            icon={<Flame className="h-3 w-3" />}
            label="Burnout"
            value={rec.burnoutRiskChange}
            positive={rec.burnoutRiskChange <= 0}
            suffix="%"
            invert
          />
        </div>

        {/* Action buttons */}
        <div className="pl-11 flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => handleDecision('ACCEPTED')}
            disabled={isPending}
            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Accept
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-950"
              >
                <X className="h-3 w-3" />
                Reject
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject Recommendation</AlertDialogTitle>
                <AlertDialogDescription>
                  Provide a reason to help the AI learn from your decision.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Textarea
                placeholder="Why isn't this recommendation suitable? (optional)"
                value={rejectionReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                className="min-h-[80px]"
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDecision('REJECTED')}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Confirm Reject
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

function ImpactPill({
  icon,
  label,
  value,
  positive,
  suffix = '',
  invert = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  positive: boolean
  suffix?: string
  invert?: boolean
}) {
  const display = invert
    ? (value <= 0 ? `${value}${suffix}` : `+${value}${suffix}`)
    : (value >= 0 ? `+${value}${suffix}` : `${value}${suffix}`)

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium',
      positive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'
    )}>
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{display}</span>
    </div>
  )
}

export default RecommendationsPanel
