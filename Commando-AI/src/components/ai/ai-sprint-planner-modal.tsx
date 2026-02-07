'use client'

import React, { useState, useTransition, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  AlertTriangle,
  TrendingUp,
  Clock,
  Users,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AISprintPlan, AISprintTask, AICapacityAnalysis } from '@/lib/ai/ai.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onFetchPlan: () => Promise<AISprintPlan | null>
  onApply: (plan: AISprintPlan, selectedTaskIds: string[]) => Promise<void>
}

function CapacityBar({ analysis }: { analysis: AICapacityAnalysis }) {
  const utilizationPercent = Math.min(100, analysis.utilizationPercent)
  const isOverCapacity = analysis.utilizationPercent > 100

  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Capacity
        </span>
        <span className={cn(
          'font-medium',
          isOverCapacity ? 'text-red-500' : 'text-green-500'
        )}>
          {analysis.utilizationPercent}% utilized
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isOverCapacity ? 'bg-red-500' : 'bg-green-500'
          )}
          style={{ width: `${utilizationPercent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Available: {analysis.availableCapacity}h</span>
        <span>Planned: {analysis.totalPlannedEffort}h</span>
      </div>
    </div>
  )
}

function TaskList({
  title,
  tasks,
  selectedIds,
  onToggle,
  variant = 'recommended',
}: {
  title: string
  tasks: AISprintTask[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
  variant?: 'recommended' | 'deferred'
}) {
  if (tasks.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        {variant === 'recommended' ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground" />
        )}
        {title}
        <Badge variant="outline" className="text-xs">
          {tasks.length}
        </Badge>
      </h4>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.issueId}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              selectedIds.has(task.issueId)
                ? 'border-primary bg-primary/5'
                : 'hover:bg-muted/50',
              variant === 'deferred' && 'opacity-70'
            )}
            onClick={() => onToggle(task.issueId)}
          >
            <Checkbox
              checked={selectedIds.has(task.issueId)}
              className="mt-0.5"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              onCheckedChange={() => onToggle(task.issueId)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">
                  {task.issueKey}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    task.priority === 'CRITICAL' && 'text-red-500 border-red-500/50',
                    task.priority === 'HIGH' && 'text-orange-500 border-orange-500/50',
                    task.priority === 'MEDIUM' && 'text-yellow-500 border-yellow-500/50',
                    task.priority === 'LOW' && 'text-gray-500 border-gray-500/50'
                  )}
                >
                  {task.priority}
                </Badge>
                {task.estimatedEffort && (
                  <span className="text-xs text-muted-foreground">
                    {task.estimatedEffort}h
                  </span>
                )}
              </div>
              <p className="text-sm font-medium line-clamp-1">{task.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                {task.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AISprintPlannerModal({
  open,
  onOpenChange,
  projectId,
  onFetchPlan,
  onApply,
}: Props) {
  const [plan, setPlan] = useState<AISprintPlan | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isFetching, startFetching] = useTransition()
  const [isApplying, startApplying] = useTransition()

  useEffect(() => {
    if (open && !plan && !isFetching) {
      handleFetch()
    }
  }, [open])

  const handleFetch = () => {
    setError(null)
    setPlan(null)
    setSelectedTaskIds(new Set())

    startFetching(async () => {
      try {
        const result = await onFetchPlan()
        if (result) {
          setPlan(result)
          // Pre-select all recommended tasks
          const recommended = new Set(result.recommendedTasks.map((t) => t.issueId))
          setSelectedTaskIds(recommended)
        } else {
          setError('Failed to generate sprint plan. Please try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  const toggleTask = (id: string) => {
    const newSelected = new Set(selectedTaskIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTaskIds(newSelected)
  }

  const handleApply = () => {
    if (!plan || selectedTaskIds.size === 0) return

    startApplying(async () => {
      try {
        await onApply(plan, Array.from(selectedTaskIds))
        onOpenChange(false)
        setPlan(null)
        setSelectedTaskIds(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply sprint plan')
      }
    })
  }

  const handleClose = () => {
    onOpenChange(false)
    setPlan(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Sprint Planner
          </DialogTitle>
          <DialogDescription>
            Get AI recommendations for your next sprint based on priorities, dependencies, and team capacity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {/* Loading state */}
          {isFetching && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing backlog and team capacity...
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !isFetching && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleFetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          )}

          {/* Plan result */}
          {plan && !isFetching && (
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-4">
                {/* Sprint Goal */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Suggested Sprint Goal</h3>
                  </div>
                  <p className="text-sm">{plan.suggestedGoal}</p>
                </div>

                {/* Capacity Analysis */}
                {plan.capacityAnalysis && (
                  <CapacityBar analysis={plan.capacityAnalysis} />
                )}

                {/* Warnings */}
                {plan.warnings && plan.warnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-1">
                    {plan.warnings.map((warning, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />

                {/* Recommended Tasks */}
                <TaskList
                  title="Recommended for Sprint"
                  tasks={plan.recommendedTasks}
                  selectedIds={selectedTaskIds}
                  onToggle={toggleTask}
                  variant="recommended"
                />

                {/* Deferred Tasks */}
                <TaskList
                  title="Consider Deferring"
                  tasks={plan.deferredTasks}
                  selectedIds={selectedTaskIds}
                  onToggle={toggleTask}
                  variant="deferred"
                />

                {/* Regenerate button */}
                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFetch}
                    disabled={isFetching}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Re-analyze
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {plan && (
            <Button
              onClick={handleApply}
              disabled={selectedTaskIds.size === 0 || isApplying}
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Add {selectedTaskIds.size} to Sprint
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AISprintPlannerModal
