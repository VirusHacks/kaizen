'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
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
  GripVertical,
} from 'lucide-react'
import Link from 'next/link'
import { IssueType, IssuePriority } from '@/lib/types'

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  EPIC: <Zap className="h-3.5 w-3.5 text-purple-500" />,
  STORY: <BookOpen className="h-3.5 w-3.5 text-green-500" />,
  TASK: <CheckSquare className="h-3.5 w-3.5 text-blue-500" />,
  BUG: <Bug className="h-3.5 w-3.5 text-red-500" />,
  SUBTASK: <Layers className="h-3.5 w-3.5 text-gray-500" />,
}

const priorityIcons: Record<IssuePriority, React.ReactNode> = {
  LOW: <ArrowDown className="h-3.5 w-3.5 text-gray-400" />,
  MEDIUM: <Minus className="h-3.5 w-3.5 text-yellow-500" />,
  HIGH: <ArrowUp className="h-3.5 w-3.5 text-orange-500" />,
  CRITICAL: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
}

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
  issue: KanbanIssue
  projectId: string
  projectKey: string
  isDragging?: boolean
}

const KanbanIssueCard = ({ issue, projectId, projectKey, isDragging }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: issue.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const issueKey = `${projectKey}-${issue.number}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-background rounded-lg border p-3 shadow-sm cursor-grab active:cursor-grabbing transition-all',
        'hover:border-primary/50 hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg rotate-2 scale-105',
        isDragging && 'opacity-100 shadow-xl'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Header: Key + Type Icon */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs text-muted-foreground">{issueKey}</span>
        {issueTypeIcons[issue.type as IssueType]}
        {priorityIcons[issue.priority as IssuePriority]}
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Title */}
      <Link
        href={`/projects/${projectId}/issues/${issue.id}`}
        className="block text-sm font-medium line-clamp-2 hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {issue.title}
      </Link>

      {/* Footer: Subtasks + Assignee */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {issue._count.children > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {issue._count.children}
            </span>
          )}
        </div>

        {issue.assignee && (
          <Avatar className="h-6 w-6">
            <AvatarImage src={issue.assignee.profileImage || undefined} />
            <AvatarFallback className="text-xs">
              {(issue.assignee.name || issue.assignee.email || '?')
                .charAt(0)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

export default KanbanIssueCard
