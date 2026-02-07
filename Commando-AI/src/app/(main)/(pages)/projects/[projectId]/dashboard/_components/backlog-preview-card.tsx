'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Layers,
  ArrowRight,
  Target,
  BookOpen,
  CheckSquare,
  Bug,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IssueType, IssueStatus, IssuePriority } from '@prisma/client'

type BacklogIssue = {
  id: string
  number: number
  title: string
  type: IssueType
  status: IssueStatus
  priority: IssuePriority
  assignee: {
    clerkId: string
    name: string | null
    profileImage: string | null
  } | null
}

type Props = {
  projectId: string
  projectKey: string
  totalCount: number
  issues: BacklogIssue[]
}

const TYPE_ICONS: Record<IssueType, React.ElementType> = {
  EPIC: Target,
  STORY: BookOpen,
  TASK: CheckSquare,
  BUG: Bug,
  SUBTASK: Layers,
}

const PRIORITY_CONFIG: Record<IssuePriority, { icon: React.ElementType; color: string }> = {
  CRITICAL: { icon: AlertCircle, color: 'text-red-500' },
  HIGH: { icon: ArrowUp, color: 'text-orange-500' },
  MEDIUM: { icon: Minus, color: 'text-yellow-500' },
  LOW: { icon: ArrowDown, color: 'text-gray-500' },
}

const BacklogPreviewCard = ({ projectId, projectKey, totalCount, issues }: Props) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Layers className="h-4 w-4" />
          Backlog
        </CardTitle>
        <Badge variant="secondary">{totalCount} items</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {issues.length === 0 ? (
          <div className="text-center py-6">
            <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Backlog is empty</p>
          </div>
        ) : (
          <>
            {issues.map((issue) => {
              const TypeIcon = TYPE_ICONS[issue.type]
              const priorityConfig = PRIORITY_CONFIG[issue.priority]
              const PriorityIcon = priorityConfig.icon

              return (
                <Link
                  key={issue.id}
                  href={`/projects/${projectId}/issues/${issue.id}`}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {projectKey}-{issue.number}
                  </span>
                  <span className="text-sm truncate flex-1 group-hover:text-primary transition-colors">
                    {issue.title}
                  </span>
                  <PriorityIcon className={cn("h-3 w-3 flex-shrink-0", priorityConfig.color)} />
                  {issue.assignee && (
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarImage src={issue.assignee.profileImage || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {issue.assignee.name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </Link>
              )
            })}
            
            {totalCount > issues.length && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {totalCount - issues.length} more items
              </p>
            )}
          </>
        )}

        <Link href={`/projects/${projectId}/backlog`} className="block pt-2">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            View Backlog
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default BacklogPreviewCard
