'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Zap,
  Bug,
  BookOpen,
  CheckSquare,
  Layers,
  Timer,
  TrendingUp,
} from 'lucide-react'
import DevKanbanBoard from './dev-kanban-board'
import TaskDetailPanel from './task-detail-panel'

// ==========================================
// TYPES
// ==========================================

export type DevIssue = {
  id: string
  number: number
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  createdAt: string | Date
  updatedAt: string | Date
  startDate: string | Date | null
  dueDate: string | Date | null
  assignee: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  } | null
  reporter: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  }
  parent: {
    id: string
    title: string
    number: number
    type: string
  } | null
  sprint: {
    id: string
    name: string
    status: string
  } | null
  _count: {
    children: number
  }
}

type DevStats = {
  total: number
  todo: number
  inProgress: number
  inReview: number
  done: number
  critical: number
  high: number
  completionRate: number
  activeSprint: {
    id: string
    name: string
    endDate: string | null
    myIssueCount: number
  } | null
} | null

type Props = {
  projectId: string
  projectKey: string
  projectName: string
  initialIssues: DevIssue[]
  stats: DevStats
  allowedTransitions: Record<string, string[]>
}

// ==========================================
// STAT CARDS
// ==========================================

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  subtext,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  color: string
  subtext?: string
}) => (
  <div className="rounded-xl border bg-card p-4 flex items-center gap-4">
    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', color)}>
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      {subtext && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtext}</p>}
    </div>
  </div>
)

// ==========================================
// PRIORITY / TYPE ICONS
// ==========================================

const priorityConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CRITICAL: { icon: AlertTriangle, color: 'text-red-500', label: 'Critical' },
  HIGH: { icon: ArrowUp, color: 'text-orange-500', label: 'High' },
  MEDIUM: { icon: Minus, color: 'text-yellow-500', label: 'Medium' },
  LOW: { icon: ArrowDown, color: 'text-gray-400', label: 'Low' },
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  EPIC: { icon: Zap, color: 'text-purple-500', label: 'Epic' },
  STORY: { icon: BookOpen, color: 'text-green-500', label: 'Story' },
  TASK: { icon: CheckSquare, color: 'text-blue-500', label: 'Task' },
  BUG: { icon: Bug, color: 'text-red-500', label: 'Bug' },
  SUBTASK: { icon: Layers, color: 'text-gray-500', label: 'Subtask' },
}

const statusColors: Record<string, string> = {
  TODO: 'bg-gray-500',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
}

const statusLabels: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function DeveloperDashboardClient({
  projectId,
  projectKey,
  projectName,
  initialIssues,
  stats,
  allowedTransitions,
}: Props) {
  const [view, setView] = useState<'board' | 'list'>('board')
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'todo' | 'review'>('all')

  const selectedIssue = useMemo(
    () => initialIssues.find((i) => i.id === selectedIssueId) || null,
    [initialIssues, selectedIssueId]
  )

  const filteredIssues = useMemo(() => {
    switch (filter) {
      case 'active':
        return initialIssues.filter((i) => i.status === 'IN_PROGRESS')
      case 'todo':
        return initialIssues.filter((i) => i.status === 'TODO')
      case 'review':
        return initialIssues.filter((i) => i.status === 'IN_REVIEW')
      default:
        return initialIssues
    }
  }, [initialIssues, filter])

  const handleSelectIssue = useCallback((issueId: string) => {
    setSelectedIssueId((prev) => (prev === issueId ? null : issueId))
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main Area */}
      <div className={cn('flex-1 flex flex-col overflow-hidden', selectedIssue && 'mr-0')}>
        {/* Stats Row */}
        {stats && (
          <div className="p-6 pb-0">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <StatCard icon={Target} label="Total Assigned" value={stats.total} color="bg-primary/10 text-primary" />
              <StatCard icon={Clock} label="To Do" value={stats.todo} color="bg-gray-500/10 text-gray-500" />
              <StatCard icon={Activity} label="In Progress" value={stats.inProgress} color="bg-blue-500/10 text-blue-500" />
              <StatCard icon={Timer} label="In Review" value={stats.inReview} color="bg-yellow-500/10 text-yellow-500" />
              <StatCard icon={CheckCircle2} label="Done" value={stats.done} color="bg-green-500/10 text-green-500" />
              <StatCard
                icon={TrendingUp}
                label="Completion"
                value={`${stats.completionRate}%`}
                color="bg-emerald-500/10 text-emerald-500"
                subtext={stats.activeSprint ? `Sprint: ${stats.activeSprint.name}` : undefined}
              />
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">My Tasks</h2>
            <Badge variant="secondary" className="font-mono">
              {filteredIssues.length}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter pills */}
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
              {(['all', 'active', 'todo', 'review'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-background shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'todo' ? 'To Do' : 'Review'}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border bg-muted/30 p-0.5 gap-0.5">
              <button
                onClick={() => setView('board')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  view === 'board' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'
                )}
                title="Board view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn(
                  'p-1.5 rounded-md transition-colors',
                  view === 'list' ? 'bg-background shadow' : 'text-muted-foreground hover:text-foreground'
                )}
                title="List view"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {filteredIssues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 opacity-50 mb-4" />
              <p className="font-medium">
                {filter === 'all' ? 'No tasks assigned to you yet' : `No ${filter} tasks`}
              </p>
              <p className="text-sm mt-1">
                {filter === 'all'
                  ? 'Ask your project manager to assign tasks to you.'
                  : 'Try a different filter.'}
              </p>
            </div>
          ) : view === 'board' ? (
            <DevKanbanBoard
              issues={filteredIssues}
              projectId={projectId}
              projectKey={projectKey}
              allowedTransitions={allowedTransitions}
              onSelectIssue={handleSelectIssue}
              selectedIssueId={selectedIssueId}
            />
          ) : (
            /* List View */
            <div className="px-6 pb-6">
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Key</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Title</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Priority</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Sprint</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue) => {
                      const tc = typeConfig[issue.type]
                      const pc = priorityConfig[issue.priority]
                      const TypeIcon = tc?.icon || CheckSquare
                      const PriorityIcon = pc?.icon || Minus

                      return (
                        <tr
                          key={issue.id}
                          onClick={() => handleSelectIssue(issue.id)}
                          className={cn(
                            'border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50',
                            selectedIssueId === issue.id && 'bg-primary/5'
                          )}
                        >
                          <td className="p-3 font-mono text-xs text-muted-foreground">
                            {projectKey}-{issue.number}
                          </td>
                          <td className="p-3 text-sm font-medium max-w-[300px] truncate">
                            {issue.title}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className={cn('h-3.5 w-3.5', tc?.color)} />
                              <span className="text-xs">{tc?.label || issue.type}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <div className={cn('w-2 h-2 rounded-full', statusColors[issue.status])} />
                              <span className="text-xs">{statusLabels[issue.status] || issue.status}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <PriorityIcon className={cn('h-3.5 w-3.5', pc?.color)} />
                              <span className="text-xs">{pc?.label || issue.priority}</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {issue.sprint?.name || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedIssue && (
        <TaskDetailPanel
          issue={selectedIssue}
          projectId={projectId}
          projectKey={projectKey}
          onClose={() => setSelectedIssueId(null)}
        />
      )}
    </div>
  )
}
