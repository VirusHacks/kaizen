'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { Layers } from 'lucide-react'
import BacklogIssueCard from './backlog-issue-card'

type BacklogIssue = {
  id: string
  number: number
  title: string
  description: string | null
  type: string
  status: string
  priority: string
  sprintId: string | null
  assignee: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  } | null
  reporter?: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  }
  _count?: {
    children: number
  }
}

type Props = {
  issues: BacklogIssue[]
  projectId: string
  projectKey: string
  isUpdating?: boolean
}

const BacklogSection = ({ issues, projectId, projectKey, isUpdating }: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog',
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border bg-muted/20 transition-colors',
        isOver && 'border-primary/50 bg-muted/40',
        isUpdating && 'opacity-70 pointer-events-none'
      )}
    >
      {/* Section Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-500/10">
            <Layers className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <h3 className="font-medium">Backlog</h3>
            <p className="text-xs text-muted-foreground">
              {issues.length} issue{issues.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Issues */}
      <div className="p-2">
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Layers className="h-8 w-8 opacity-50 mb-2" />
              <p className="text-sm">Backlog is empty</p>
              <p className="text-xs">Create issues to add them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {issues.map((issue) => (
                <BacklogIssueCard
                  key={issue.id}
                  issue={issue}
                  projectId={projectId}
                  projectKey={projectKey}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

export default BacklogSection
