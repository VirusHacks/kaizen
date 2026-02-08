'use client'

import React, { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { IssueStatus } from '@/lib/types'
import { changeIssueStatus } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/issues/_actions/issue-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bug,
  Zap,
  BookOpen,
  CheckSquare,
  Layers,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Ban,
  GripVertical,
  Github,
  CircleDot,
  ExternalLink,
} from 'lucide-react'
import type { DevIssue } from './developer-dashboard-client'

const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'bg-gray-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', title: 'In Review', color: 'bg-yellow-500' },
  { id: 'DONE', title: 'Done', color: 'bg-green-500' },
]

const issueTypeIcons: Record<string, React.ReactNode> = {
  EPIC: <Zap className="h-3.5 w-3.5 text-purple-500" />,
  STORY: <BookOpen className="h-3.5 w-3.5 text-green-500" />,
  TASK: <CheckSquare className="h-3.5 w-3.5 text-blue-500" />,
  BUG: <Bug className="h-3.5 w-3.5 text-red-500" />,
  SUBTASK: <Layers className="h-3.5 w-3.5 text-gray-500" />,
  GITHUB_ISSUE: <CircleDot className="h-3.5 w-3.5 text-green-500" />,
}

const priorityIcons: Record<string, React.ReactNode> = {
  LOW: <ArrowDown className="h-3.5 w-3.5 text-gray-400" />,
  MEDIUM: <Minus className="h-3.5 w-3.5 text-yellow-500" />,
  HIGH: <ArrowUp className="h-3.5 w-3.5 text-orange-500" />,
  CRITICAL: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
}

// ==========================================
// ISSUE CARD
// ==========================================

function DevIssueCard({
  issue,
  projectKey,
  onSelect,
  isSelected,
  isDragging,
}: {
  issue: DevIssue
  projectKey: string
  onSelect: (id: string) => void
  isSelected: boolean
  isDragging?: boolean
}) {
  const isGitHub = issue.source === 'github'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: issue.id, disabled: isGitHub })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-background rounded-lg border p-3 shadow-sm transition-all cursor-pointer',
        'hover:border-primary/50 hover:shadow-md',
        isSelected && 'border-primary ring-2 ring-primary/20',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-1 scale-105',
        isGitHub && 'border-l-2 border-l-green-500/60',
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (isGitHub && issue.githubUrl) {
          window.open(issue.githubUrl, '_blank')
        } else {
          onSelect(issue.id)
        }
      }}
    >
      {/* Drag handle + Key */}
      <div className="flex items-center gap-2 mb-2">
        {!isGitHub ? (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
          </div>
        ) : (
          <Github className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
        <span className="font-mono text-xs text-muted-foreground">
          {isGitHub ? `#${issue.number}` : `${projectKey}-${issue.number}`}
        </span>
        {issueTypeIcons[issue.type]}
        {priorityIcons[issue.priority]}
        {isGitHub && (
          <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto" />
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium line-clamp-2">{issue.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          {issue.sprint && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {issue.sprint.name}
            </span>
          )}
          {isGitHub && issue.githubLabels && issue.githubLabels.length > 0 && (
            <div className="flex items-center gap-1">
              {issue.githubLabels.slice(0, 2).map((l) => (
                <span
                  key={l.id}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: `#${l.color}20`,
                    color: `#${l.color}`,
                    border: `1px solid #${l.color}40`,
                  }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}
          {issue._count.children > 0 && (
            <span className="text-[10px] flex items-center gap-0.5 text-muted-foreground">
              <Layers className="h-3 w-3" />
              {issue._count.children}
            </span>
          )}
        </div>

        {issue.parent && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={issue.parent.title}>
            ↑ {projectKey}-{issue.parent.number}
          </span>
        )}
      </div>
    </div>
  )
}

// ==========================================
// COLUMN
// ==========================================

function DevColumn({
  id,
  title,
  color,
  issues,
  projectKey,
  onSelectIssue,
  selectedIssueId,
  isDropAllowed,
  isDragging,
  isUpdating,
}: {
  id: IssueStatus
  title: string
  color: string
  issues: DevIssue[]
  projectKey: string
  onSelectIssue: (id: string) => void
  selectedIssueId: string | null
  isDropAllowed: boolean
  isDragging: boolean
  isUpdating: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !isDropAllowed })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col flex-1 min-w-[260px] bg-muted/30 rounded-lg border transition-all',
        isOver && isDropAllowed && 'border-primary/50 bg-muted/50 ring-2 ring-primary/20',
        isOver && !isDropAllowed && 'border-red-500/50 bg-red-500/10',
        isDragging && !isDropAllowed && 'opacity-50 border-dashed',
        isDragging && isDropAllowed && 'border-green-500/30',
        isUpdating && 'opacity-70 pointer-events-none',
      )}
    >
      <div className="p-3 border-b flex items-center gap-2">
        <div className={cn('w-3 h-3 rounded-full', color)} />
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {issues.length}
        </span>
        {isDragging && !isDropAllowed && <Ban className="h-4 w-4 text-red-500 ml-1" />}
      </div>

      <div className="flex-1 p-2 overflow-y-auto">
        <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {issues.length === 0 ? (
              <div
                className={cn(
                  'flex items-center justify-center h-20 text-muted-foreground text-sm rounded-lg',
                  isDragging && isDropAllowed && 'border-2 border-dashed border-green-500/30 bg-green-500/5',
                  isDragging && !isDropAllowed && 'border-2 border-dashed border-red-500/30',
                )}
              >
                {isDragging && !isDropAllowed ? 'Not allowed' : 'No tasks'}
              </div>
            ) : (
              issues.map((issue) => (
                <DevIssueCard
                  key={issue.id}
                  issue={issue}
                  projectKey={projectKey}
                  onSelect={onSelectIssue}
                  isSelected={selectedIssueId === issue.id}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

// ==========================================
// MAIN BOARD
// ==========================================

type Props = {
  issues: DevIssue[]
  projectId: string
  projectKey: string
  allowedTransitions: Record<string, string[]>
  onSelectIssue: (id: string) => void
  selectedIssueId: string | null
}

export default function DevKanbanBoard({
  issues,
  projectId,
  projectKey,
  allowedTransitions,
  onSelectIssue,
  selectedIssueId,
}: Props) {
  const router = useRouter()
  const [localIssues, setLocalIssues] = useState<DevIssue[]>(issues)
  const [activeIssue, setActiveIssue] = useState<DevIssue | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync with parent
  React.useEffect(() => {
    setLocalIssues(issues)
  }, [issues])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const isTransitionAllowed = (from: string, to: string) => {
    if (Object.keys(allowedTransitions).length === 0) return true
    if (from === to) return true
    return allowedTransitions[from]?.includes(to) ?? false
  }

  const issuesByStatus = useMemo(() => {
    const grouped: Record<IssueStatus, DevIssue[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    }
    localIssues.forEach((issue) => {
      const s = issue.status as IssueStatus
      if (grouped[s]) grouped[s].push(issue)
    })
    return grouped
  }, [localIssues])

  const handleDragStart = (event: DragStartEvent) => {
    const issue = localIssues.find((i) => i.id === event.active.id)
    if (issue) setActiveIssue(issue)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    let targetStatus: IssueStatus | null = null
    if (COLUMNS.some((c) => c.id === overId)) {
      targetStatus = overId as IssueStatus
    } else {
      const overIssue = localIssues.find((i) => i.id === overId)
      if (overIssue) targetStatus = overIssue.status as IssueStatus
    }

    if (!targetStatus) return
    const issue = localIssues.find((i) => i.id === activeId)
    if (!issue || issue.status === targetStatus) return

    if (issue.source === 'github') {
      toast.error('GitHub issue status can only be changed on GitHub')
      setLocalIssues((p) => [...p]) // reset
      return
    }

    if (!isTransitionAllowed(issue.status, targetStatus)) {
      toast.error('Workflow does not allow this transition')
      return
    }

    // Optimistic update
    const prev = [...localIssues]
    setLocalIssues((p) => p.map((i) => (i.id === activeId ? { ...i, status: targetStatus! } : i)))
    setIsUpdating(true)

    try {
      const result = await changeIssueStatus(activeId, targetStatus)
      if (result.error) {
        setLocalIssues(prev)
        toast.error(result.error)
      } else {
        toast.success(`Moved to ${COLUMNS.find((c) => c.id === targetStatus)?.title}`)
        router.refresh()
      }
    } catch {
      setLocalIssues(prev)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex-1 overflow-x-auto px-6 pb-6 w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full min-h-[500px] w-full">
          {COLUMNS.map((col) => (
            <DevColumn
              key={col.id}
              id={col.id}
              title={col.title}
              color={col.color}
              issues={issuesByStatus[col.id]}
              projectKey={projectKey}
              onSelectIssue={onSelectIssue}
              selectedIssueId={selectedIssueId}
              isDropAllowed={activeIssue ? isTransitionAllowed(activeIssue.status, col.id) : true}
              isDragging={!!activeIssue}
              isUpdating={isUpdating}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue && (
            <div className="bg-background rounded-lg border p-3 shadow-xl rotate-2 scale-105 w-[260px]">
              <div className="flex items-center gap-2 mb-2">
                {activeIssue.source === 'github' && (
                  <Github className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                <span className="font-mono text-xs text-muted-foreground">
                  {activeIssue.source === 'github'
                    ? `#${activeIssue.number}`
                    : `${projectKey}-${activeIssue.number}`}
                </span>
                {issueTypeIcons[activeIssue.type]}
                {priorityIcons[activeIssue.priority]}
              </div>
              <p className="text-sm font-medium line-clamp-2">{activeIssue.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
