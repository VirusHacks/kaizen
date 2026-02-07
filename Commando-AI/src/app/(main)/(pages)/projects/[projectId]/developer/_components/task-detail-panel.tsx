'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  X,
  Zap,
  Bug,
  BookOpen,
  CheckSquare,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Clock,
  User,
  CalendarDays,
  GitBranch,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileCode,
  Database,
  TestTube,
  Puzzle,
  Server,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import type { DevIssue } from './developer-dashboard-client'

// ==========================================
// CONFIG
// ==========================================

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string; badgeColor: string }> = {
  EPIC: { icon: Zap, color: 'text-purple-500', label: 'Epic', badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  STORY: { icon: BookOpen, color: 'text-green-500', label: 'Story', badgeColor: 'bg-green-500/10 text-green-500 border-green-500/20' },
  TASK: { icon: CheckSquare, color: 'text-blue-500', label: 'Task', badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  BUG: { icon: Bug, color: 'text-red-500', label: 'Bug', badgeColor: 'bg-red-500/10 text-red-500 border-red-500/20' },
  SUBTASK: { icon: Layers, color: 'text-gray-500', label: 'Subtask', badgeColor: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
}

const priorityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CRITICAL: { icon: AlertTriangle, color: 'text-red-500', label: 'Critical' },
  HIGH: { icon: ArrowUp, color: 'text-orange-500', label: 'High' },
  MEDIUM: { icon: Minus, color: 'text-yellow-500', label: 'Medium' },
  LOW: { icon: ArrowDown, color: 'text-gray-400', label: 'Low' },
}

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

const statusColors: Record<string, string> = {
  TODO: 'bg-gray-500',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
}

const stepCategoryIcons: Record<string, React.ElementType> = {
  architecture: Server,
  file_changes: FileCode,
  database: Database,
  integration: Puzzle,
  testing: TestTube,
  default: CheckSquare,
}

// ==========================================
// TYPES
// ==========================================

type ImplementationStep = {
  step: number
  title: string
  description: string
  category: string
  files?: string[]
  commands?: string[]
}

type ImplementationPlan = {
  summary: string
  estimatedTime: string
  acceptanceCriteria: string[]
  steps: ImplementationStep[]
}

// ==========================================
// PROPS
// ==========================================

type Props = {
  issue: DevIssue
  projectId: string
  projectKey: string
  onClose: () => void
}

// ==========================================
// COMPONENT
// ==========================================

export default function TaskDetailPanel({ issue, projectId, projectKey, onClose }: Props) {
  const [plan, setPlan] = useState<ImplementationPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const tc = typeConfig[issue.type] || typeConfig.TASK
  const pc = priorityConfig[issue.priority] || priorityConfig.MEDIUM
  const TypeIcon = tc.icon
  const PriorityIcon = pc.icon

  // Reset plan when issue changes
  useEffect(() => {
    setPlan(null)
    setPlanError(null)
    setExpandedSteps(new Set())
    setCompletedSteps(new Set())
  }, [issue.id])

  const generatePlan = useCallback(async () => {
    setIsGenerating(true)
    setPlanError(null)

    try {
      const res = await fetch('/api/ai/dev-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          issueId: issue.id,
          issueTitle: issue.title,
          issueDescription: issue.description,
          issueType: issue.type,
          parentTitle: issue.parent?.title || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate plan')

      const data = await res.json()
      setPlan(data.plan)
      // Auto-expand first step
      setExpandedSteps(new Set([1]))
    } catch {
      setPlanError('Failed to generate implementation plan. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [projectId, issue])

  const toggleStep = (step: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(step)) next.delete(step)
      else next.add(step)
      return next
    })
  }

  const toggleStepComplete = (step: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(step)) next.delete(step)
      else next.add(step)
      return next
    })
  }

  return (
    <div className="w-[420px] border-l bg-background flex flex-col shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">
              {projectKey}-{issue.number}
            </span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', tc.badgeColor)}>
              <TypeIcon className={cn('h-3 w-3 mr-1', tc.color)} />
              {tc.label}
            </Badge>
          </div>
          <h3 className="font-semibold text-sm leading-snug">{issue.title}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors[issue.status])} />
              <span className="text-muted-foreground">{statusLabels[issue.status]}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <PriorityIcon className={cn('h-4 w-4', pc.color)} />
              <span className="text-muted-foreground">{pc.label}</span>
            </div>
            {issue.sprint && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{issue.sprint.name}</span>
              </div>
            )}
            {issue.reporter && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs truncate">
                  {issue.reporter.name || issue.reporter.email}
                </span>
              </div>
            )}
            {issue.dueDate && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  {new Date(issue.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {issue.description && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Description</h4>
              <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border">
                {issue.description}
              </div>
            </div>
          )}

          {/* Parent */}
          {issue.parent && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Parent Issue</h4>
              <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg p-2.5 border">
                {issueTypeIcon(issue.parent.type)}
                <span className="font-mono text-xs text-muted-foreground">{projectKey}-{issue.parent.number}</span>
                <span className="truncate">{issue.parent.title}</span>
              </div>
            </div>
          )}

          {/* Subtasks */}
          {issue._count.children > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                Subtasks ({issue._count.children})
              </h4>
              <p className="text-xs text-muted-foreground">
                This task has {issue._count.children} subtask{issue._count.children > 1 ? 's' : ''}.
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t" />

          {/* AI Implementation Plan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Implementation Plan
              </h4>
              {!plan && !isGenerating && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={generatePlan}>
                  <Sparkles className="h-3 w-3" />
                  Generate
                </Button>
              )}
              {plan && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={generatePlan}>
                  Regenerate
                </Button>
              )}
            </div>

            {isGenerating && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing task and generating plan...</p>
              </div>
            )}

            {planError && (
              <div className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                {planError}
              </div>
            )}

            {plan && !isGenerating && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <p className="text-sm leading-relaxed">{plan.summary}</p>
                  {plan.estimatedTime && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Est. {plan.estimatedTime}</span>
                    </div>
                  )}
                </div>

                {/* Acceptance Criteria */}
                {plan.acceptanceCriteria && plan.acceptanceCriteria.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">Acceptance Criteria</h5>
                    <ul className="space-y-1">
                      {plan.acceptanceCriteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Steps */}
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-2">
                    Steps ({completedSteps.size}/{plan.steps.length} done)
                  </h5>
                  <div className="space-y-1.5">
                    {plan.steps.map((step) => {
                      const StepIcon = stepCategoryIcons[step.category] || stepCategoryIcons.default
                      const isExpanded = expandedSteps.has(step.step)
                      const isDone = completedSteps.has(step.step)

                      return (
                        <div
                          key={step.step}
                          className={cn(
                            'rounded-lg border transition-colors',
                            isDone && 'bg-green-500/5 border-green-500/20',
                          )}
                        >
                          {/* Step header */}
                          <button
                            onClick={() => toggleStep(step.step)}
                            className="w-full flex items-center gap-2 p-2.5 text-left"
                          >
                            <button
                              onClick={(e) => toggleStepComplete(step.step, e)}
                              className="shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground" />
                              )}
                            </button>
                            <StepIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span
                              className={cn(
                                'text-sm font-medium flex-1',
                                isDone && 'line-through text-muted-foreground',
                              )}
                            >
                              {step.step}. {step.title}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </button>

                          {/* Step detail */}
                          {isExpanded && (
                            <div className="px-2.5 pb-2.5 pt-0 ml-[52px] space-y-2">
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                              {step.files && step.files.length > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase font-semibold text-muted-foreground/70 mb-1">
                                    Files
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {step.files.map((f, i) => (
                                      <code
                                        key={i}
                                        className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-mono"
                                      >
                                        {f}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {step.commands && step.commands.length > 0 && (
                                <div>
                                  <p className="text-[10px] uppercase font-semibold text-muted-foreground/70 mb-1">
                                    Commands
                                  </p>
                                  <div className="space-y-1">
                                    {step.commands.map((cmd, i) => (
                                      <code
                                        key={i}
                                        className="block text-[11px] bg-muted/70 px-2 py-1 rounded font-mono text-muted-foreground"
                                      >
                                        $ {cmd}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {!plan && !isGenerating && !planError && (
              <div className="flex flex-col items-center justify-center py-6 gap-2 bg-muted/20 rounded-lg border border-dashed">
                <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground text-center">
                  Generate an AI-powered step-by-step<br />implementation plan for this task
                </p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

// Helper
function issueTypeIcon(type: string) {
  const icons: Record<string, React.ReactNode> = {
    EPIC: <Zap className="h-3.5 w-3.5 text-purple-500" />,
    STORY: <BookOpen className="h-3.5 w-3.5 text-green-500" />,
    TASK: <CheckSquare className="h-3.5 w-3.5 text-blue-500" />,
    BUG: <Bug className="h-3.5 w-3.5 text-red-500" />,
    SUBTASK: <Layers className="h-3.5 w-3.5 text-gray-500" />,
  }
  return icons[type] || icons.TASK
}
