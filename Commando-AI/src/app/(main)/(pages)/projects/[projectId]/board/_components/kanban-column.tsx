'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { IssueStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Ban } from 'lucide-react'
import KanbanIssueCard from './kanban-issue-card'

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
  id: IssueStatus
  title: string
  color: string
  issues: KanbanIssue[]
  projectId: string
  projectKey: string
  isUpdating?: boolean
  isDropAllowed?: boolean
  isDragging?: boolean
}

const KanbanColumn = ({
  id,
  title,
  color,
  issues,
  projectId,
  projectKey,
  isUpdating,
  isDropAllowed = true,
  isDragging = false,
}: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !isDropAllowed,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col flex-1 min-w-[280px] bg-muted/30 rounded-lg border transition-all',
        isOver && isDropAllowed && 'border-primary/50 bg-muted/50 ring-2 ring-primary/20',
        isOver && !isDropAllowed && 'border-red-500/50 bg-red-500/10',
        isDragging && !isDropAllowed && 'opacity-50 border-dashed',
        isDragging && isDropAllowed && 'border-green-500/30',
        isUpdating && 'opacity-70 pointer-events-none'
      )}
    >
      {/* Column Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <div className={cn('w-3 h-3 rounded-full', color)} />
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {issues.length}
        </span>
        {/* Show blocked indicator when dragging and transition not allowed */}
        {isDragging && !isDropAllowed && (
          <Ban className="h-4 w-4 text-red-500 ml-1" />
        )}
      </div>

      {/* Column Content */}
      <div className="flex-1 p-2 overflow-y-auto">
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {issues.length === 0 ? (
              <div className={cn(
                'flex items-center justify-center h-24 text-muted-foreground text-sm',
                isDragging && isDropAllowed && 'border-2 border-dashed border-green-500/30 rounded-lg bg-green-500/5',
                isDragging && !isDropAllowed && 'border-2 border-dashed border-red-500/30 rounded-lg'
              )}>
                {isDragging && !isDropAllowed ? 'Not allowed' : 'No issues'}
              </div>
            ) : (
              issues.map((issue) => (
                <KanbanIssueCard
                  key={issue.id}
                  issue={issue}
                  projectId={projectId}
                  projectKey={projectKey}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}

export default KanbanColumn
