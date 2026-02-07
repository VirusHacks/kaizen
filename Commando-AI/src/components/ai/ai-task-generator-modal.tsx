'use client'

import React, { useState, useTransition } from 'react'
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
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  BookOpen,
  CheckSquare,
  Bug,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AIGeneratedTask } from '@/lib/ai/ai.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectKey: string
  onGenerate: () => Promise<{ tasks: AIGeneratedTask[]; reasoning?: string } | null>
  onApply: (tasks: AIGeneratedTask[]) => Promise<void>
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  EPIC: Target,
  STORY: BookOpen,
  TASK: CheckSquare,
  BUG: Bug,
  SUBTASK: Layers,
}

const TYPE_COLORS: Record<string, string> = {
  EPIC: 'bg-purple-500/10 text-purple-500',
  STORY: 'bg-blue-500/10 text-blue-500',
  TASK: 'bg-green-500/10 text-green-500',
  BUG: 'bg-red-500/10 text-red-500',
  SUBTASK: 'bg-gray-500/10 text-gray-500',
}

const PRIORITY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  CRITICAL: { icon: AlertCircle, color: 'text-red-500' },
  HIGH: { icon: ArrowUp, color: 'text-orange-500' },
  MEDIUM: { icon: Minus, color: 'text-yellow-500' },
  LOW: { icon: ArrowDown, color: 'text-gray-500' },
}

export function AITaskGeneratorModal({
  open,
  onOpenChange,
  projectId,
  projectKey,
  onGenerate,
  onApply,
}: Props) {
  const [tasks, setTasks] = useState<AIGeneratedTask[]>([])
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const [reasoning, setReasoning] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, startGenerating] = useTransition()
  const [isApplying, startApplying] = useTransition()

  const handleGenerate = () => {
    setError(null)
    setTasks([])
    setSelectedTasks(new Set())
    setReasoning('')

    startGenerating(async () => {
      try {
        const result = await onGenerate()
        if (result) {
          setTasks(result.tasks)
          setSelectedTasks(new Set(result.tasks.map((_, i) => i)))
          setReasoning(result.reasoning || '')
        } else {
          setError('Failed to generate tasks. Please try again.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
    })
  }

  const handleApply = () => {
    const tasksToApply = tasks.filter((_, i) => selectedTasks.has(i))
    if (tasksToApply.length === 0) return

    startApplying(async () => {
      try {
        await onApply(tasksToApply)
        onOpenChange(false)
        setTasks([])
        setSelectedTasks(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create tasks')
      }
    })
  }

  const toggleTask = (index: number) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedTasks(newSelected)
  }

  const toggleAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(tasks.map((_, i) => i)))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Task Generator
          </DialogTitle>
          <DialogDescription>
            Generate tasks based on your project context. Review and select tasks before adding them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {/* Initial state - no tasks generated yet */}
          {tasks.length === 0 && !isGenerating && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Ready to Generate Tasks</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                AI will analyze your project context, existing issues, and team capacity to suggest relevant tasks.
              </p>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Tasks
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing project and generating tasks...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-semibold mb-2">Generation Failed</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">{error}</p>
              <Button onClick={handleGenerate} variant="outline">
                Try Again
              </Button>
            </div>
          )}

          {/* Tasks list */}
          {tasks.length > 0 && !isGenerating && (
            <div className="space-y-4">
              {/* Reasoning */}
              {reasoning && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">AI Reasoning: </span>
                  {reasoning}
                </div>
              )}

              {/* Select all */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedTasks.size === tasks.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedTasks.size}/{tasks.length})
                  </span>
                </div>
                <Button onClick={handleGenerate} variant="ghost" size="sm" disabled={isGenerating}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>

              {/* Task list */}
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-3">
                  {tasks.map((task, index) => {
                    const TypeIcon = TYPE_ICONS[task.type] || CheckSquare
                    const priorityConfig = PRIORITY_CONFIG[task.priority]
                    const PriorityIcon = priorityConfig?.icon || Minus
                    const isSelected = selectedTasks.has(index)

                    return (
                      <div
                        key={index}
                        className={cn(
                          'rounded-lg border p-3 transition-colors cursor-pointer',
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        )}
                        onClick={() => toggleTask(index)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            className="mt-1"
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            onCheckedChange={() => toggleTask(index)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={cn('text-xs', TYPE_COLORS[task.type])}>
                                <TypeIcon className="h-3 w-3 mr-1" />
                                {task.type}
                              </Badge>
                              <PriorityIcon className={cn('h-3 w-3', priorityConfig?.color)} />
                              {task.estimatedEffort && (
                                <span className="text-xs text-muted-foreground">
                                  ~{task.estimatedEffort}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            {task.suggestedAssigneeName && (
                              <p className="text-xs text-primary mt-1">
                                Suggested: {task.suggestedAssigneeName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {tasks.length > 0 && (
            <Button
              onClick={handleApply}
              disabled={selectedTasks.size === 0 || isApplying}
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Create {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AITaskGeneratorModal
