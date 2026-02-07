'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
  Circle,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { IssueType, IssuePriority, IssueStatus } from '@/lib/types'

const issueTypeIcons: Record<IssueType, React.ReactNode> = {
  EPIC: <Zap className="h-4 w-4 text-purple-500" />,
  STORY: <BookOpen className="h-4 w-4 text-green-500" />,
  TASK: <CheckSquare className="h-4 w-4 text-blue-500" />,
  BUG: <Bug className="h-4 w-4 text-red-500" />,
  SUBTASK: <Layers className="h-4 w-4 text-gray-500" />,
}

const priorityIcons: Record<IssuePriority, React.ReactNode> = {
  LOW: <ArrowDown className="h-4 w-4 text-gray-400" />,
  MEDIUM: <Minus className="h-4 w-4 text-yellow-500" />,
  HIGH: <ArrowUp className="h-4 w-4 text-orange-500" />,
  CRITICAL: <AlertTriangle className="h-4 w-4 text-red-500" />,
}

const statusIcons: Record<IssueStatus, React.ReactNode> = {
  TODO: <Circle className="h-4 w-4 text-gray-400" />,
  IN_PROGRESS: <Clock className="h-4 w-4 text-blue-500" />,
  IN_REVIEW: <Eye className="h-4 w-4 text-yellow-500" />,
  DONE: <CheckCircle2 className="h-4 w-4 text-green-500" />,
}

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
  _count?: {
    children: number
  }
}

type Props = {
  issue: BacklogIssue
  projectId: string
  projectKey: string
  isDragging?: boolean
}

const BacklogIssueCard = ({ issue, projectId, projectKey, isDragging }: Props) => {
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
        'group bg-background rounded-lg border p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all',
        'hover:border-primary/50 hover:shadow-sm',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg scale-[1.02]',
        isDragging && 'opacity-100 shadow-xl'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

      {/* Type Icon */}
      <div className="flex-shrink-0">{issueTypeIcons[issue.type as IssueType]}</div>

      {/* Key */}
      <span className="font-mono text-xs text-muted-foreground flex-shrink-0">
        {issueKey}
      </span>

      {/* Title */}
      <Link
        href={`/projects/${projectId}/issues/${issue.id}`}
        className="flex-1 text-sm font-medium truncate hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {issue.title}
      </Link>

      {/* Status */}
      <div className="flex-shrink-0">{statusIcons[issue.status as IssueStatus]}</div>

      {/* Priority */}
      <div className="flex-shrink-0">{priorityIcons[issue.priority as IssuePriority]}</div>

      {/* Subtask count */}
      {issue._count && issue._count.children > 0 && (
        <Badge variant="secondary" className="text-xs flex-shrink-0">
          <Layers className="h-3 w-3 mr-1" />
          {issue._count.children}
        </Badge>
      )}

      {/* Assignee */}
      {issue.assignee ? (
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={issue.assignee.profileImage || undefined} />
          <AvatarFallback className="text-xs">
            {(issue.assignee.name || issue.assignee.email || '?')
              .charAt(0)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex-shrink-0" />
      )}
    </div>
  )
}

export default BacklogIssueCard
