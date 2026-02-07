'use client'

import React from 'react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Archive,
  Bug,
  Zap,
  BookOpen,
  CheckSquare,
  Layers,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertTriangle,
  Circle,
  Clock,
  CheckCircle2,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { archiveIssue, changeIssueStatus } from '../_actions/issue-actions'
import { useRouter } from 'next/navigation'
import { IssueType, IssueStatus, IssuePriority } from '@/lib/types'

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

const statusLabels: Record<IssueStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
}

const statusColors: Record<IssueStatus, string> = {
  TODO: 'bg-gray-500/10 text-gray-500',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-500',
  IN_REVIEW: 'bg-yellow-500/10 text-yellow-500',
  DONE: 'bg-green-500/10 text-green-500',
}

type Props = {
  id: string
  number: number
  title: string
  description: string | null
  type: IssueType
  status: IssueStatus
  priority: IssuePriority
  projectId: string
  projectKey: string
  assignee: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  } | null
  subtaskCount?: number
}

const IssueCard = ({
  id,
  number,
  title,
  description,
  type,
  status,
  priority,
  projectId,
  projectKey,
  assignee,
  subtaskCount = 0,
}: Props) => {
  const router = useRouter()

  const handleArchive = async () => {
    const result = await archiveIssue(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
      router.refresh()
    }
  }

  const handleStatusChange = async (newStatus: IssueStatus) => {
    const result = await changeIssueStatus(id, newStatus)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
      router.refresh()
    }
  }

  const issueKey = `${projectKey}-${number}`

  return (
    <Card className="flex w-full items-center justify-between hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-center gap-4 flex-1">
        <div className="flex items-center gap-3">
          {issueTypeIcons[type]}
        </div>
        <Link
          href={`/projects/${projectId}/issues/${id}`}
          className="flex-1 min-w-0"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm text-muted-foreground">
              {issueKey}
            </span>
            <CardTitle className="text-base truncate">{title}</CardTitle>
          </div>
          {description && (
            <CardDescription className="mt-1 line-clamp-1">
              {description}
            </CardDescription>
          )}
          {subtaskCount > 0 && (
            <span className="text-xs text-muted-foreground mt-1">
              {subtaskCount} subtask{subtaskCount > 1 ? 's' : ''}
            </span>
          )}
        </Link>
      </CardHeader>

      <div className="flex items-center gap-3 p-4">
        {/* Priority */}
        <div className="flex items-center" title={`Priority: ${priority}`}>
          {priorityIcons[priority]}
        </div>

        {/* Status Badge */}
        <Badge variant="secondary" className={statusColors[status]}>
          <span className="flex items-center gap-1">
            {statusIcons[status]}
            <span className="hidden sm:inline">{statusLabels[status]}</span>
          </span>
        </Badge>

        {/* Assignee */}
        {assignee ? (
          <Avatar className="h-7 w-7" title={assignee.name || assignee.email}>
            <AvatarImage src={assignee.profileImage || undefined} />
            <AvatarFallback className="text-xs">
              {(assignee.name || assignee.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-7 w-7 rounded-full border-2 border-dashed border-muted-foreground/30" />
        )}

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(Object.keys(statusLabels) as IssueStatus[]).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={s === status}
                  >
                    <span className="flex items-center gap-2">
                      {statusIcons[s]}
                      {statusLabels[s]}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleArchive}
              className="text-destructive"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}

export default IssueCard
