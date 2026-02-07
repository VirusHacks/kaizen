'use client'

import React, { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { IssueStatus } from '@/lib/types'
import { changeIssueStatus } from '../../issues/_actions/issue-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import KanbanColumn from './kanban-column'
import KanbanIssueCard from './kanban-issue-card'

// Status column configuration - matches IssueStatusEnum from types.ts
const COLUMNS: { id: IssueStatus; title: string; color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'bg-gray-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', title: 'In Review', color: 'bg-yellow-500' },
  { id: 'DONE', title: 'Done', color: 'bg-green-500' },
]

// Type for issue from getProjectIssues
type KanbanIssue = {
  id: string
  number: number
  title: string
  description: string | null
  type: string
  status: string
  priority: string
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
  _count: {
    children: number
  }
}

type Props = {
  initialIssues: KanbanIssue[]
  projectId: string
  projectKey: string
  allowedTransitions?: Record<string, string[]> // fromStatus -> [toStatuses]
}

const KanbanBoardClient = ({ 
  initialIssues, 
  projectId, 
  projectKey,
  allowedTransitions = {},
}: Props) => {
  const router = useRouter()
  const [issues, setIssues] = useState<KanbanIssue[]>(initialIssues)
  const [activeIssue, setActiveIssue] = useState<KanbanIssue | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Check if a transition is allowed
  const isTransitionAllowed = (fromStatus: string, toStatus: string): boolean => {
    // If no workflow configured (empty object), allow all transitions
    if (Object.keys(allowedTransitions).length === 0) return true
    // Same status is always allowed
    if (fromStatus === toStatus) return true
    // Check if transition exists in workflow
    return allowedTransitions[fromStatus]?.includes(toStatus) ?? false
  }

  // Get allowed target statuses for the active issue
  const allowedTargetStatuses = useMemo(() => {
    if (!activeIssue) return []
    const fromStatus = activeIssue.status
    // If no workflow, allow all
    if (Object.keys(allowedTransitions).length === 0) {
      return COLUMNS.map((c) => c.id)
    }
    return allowedTransitions[fromStatus] || []
  }, [activeIssue, allowedTransitions])

  // Group issues by status
  const issuesByStatus = useMemo(() => {
    const grouped: Record<IssueStatus, KanbanIssue[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    }

    issues.forEach((issue) => {
      const status = issue.status as IssueStatus
      if (grouped[status]) {
        grouped[status].push(issue)
      }
    })

    return grouped
  }, [issues])

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const issue = issues.find((i) => i.id === active.id)
    if (issue) {
      setActiveIssue(issue)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    // We handle the actual move in dragEnd
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveIssue(null)

    if (!over) return

    const activeIssueId = active.id as string
    const overId = over.id as string

    // Determine the target column (status)
    // overId could be a column id or another issue id
    let targetStatus: IssueStatus | null = null

    // Check if dropped on a column
    if (COLUMNS.some((col) => col.id === overId)) {
      targetStatus = overId as IssueStatus
    } else {
      // Dropped on an issue - find which column that issue is in
      const overIssue = issues.find((i) => i.id === overId)
      if (overIssue) {
        targetStatus = overIssue.status as IssueStatus
      }
    }

    if (!targetStatus) return

    const activeIssue = issues.find((i) => i.id === activeIssueId)
    if (!activeIssue) return

    // Don't do anything if status hasn't changed
    if (activeIssue.status === targetStatus) return

    // Check if transition is allowed (client-side pre-check)
    if (!isTransitionAllowed(activeIssue.status, targetStatus)) {
      const fromColumn = COLUMNS.find((c) => c.id === activeIssue.status)?.title
      const toColumn = COLUMNS.find((c) => c.id === targetStatus)?.title
      toast.error(`Cannot move from "${fromColumn}" to "${toColumn}" - workflow restriction`)
      return
    }

    // Optimistic update
    const previousIssues = [...issues]
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === activeIssueId ? { ...issue, status: targetStatus! } : issue
      )
    )

    setIsUpdating(true)

    try {
      const result = await changeIssueStatus(activeIssueId, targetStatus)

      if (result.error) {
        // Revert on error
        setIssues(previousIssues)
        toast.error(result.error)
      } else {
        toast.success(`Moved to ${COLUMNS.find((c) => c.id === targetStatus)?.title}`)
        router.refresh()
      }
    } catch (error) {
      // Revert on error
      setIssues(previousIssues)
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex-1 overflow-x-auto p-6 w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full min-h-[600px] w-full">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              issues={issuesByStatus[column.id]}
              projectId={projectId}
              projectKey={projectKey}
              isUpdating={isUpdating}
              isDropAllowed={
                activeIssue
                  ? isTransitionAllowed(activeIssue.status, column.id)
                  : true
              }
              isDragging={!!activeIssue}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue && (
            <KanbanIssueCard
              issue={activeIssue}
              projectId={projectId}
              projectKey={projectKey}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default KanbanBoardClient
