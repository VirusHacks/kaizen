'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CalendarDays,
  ArrowRight,
  Target,
  BookOpen,
  CheckSquare,
  Bug,
  Layers,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IssueType, IssueStatus } from '@prisma/client'

type TimelineIssue = {
  id: string
  number: number
  title: string
  type: IssueType
  status: IssueStatus
  startDate: string | null
  dueDate: string | null
}

type Props = {
  projectId: string
  projectKey: string
  issues: TimelineIssue[]
}

const TYPE_ICONS: Record<IssueType, React.ElementType> = {
  EPIC: Target,
  STORY: BookOpen,
  TASK: CheckSquare,
  BUG: Bug,
  SUBTASK: Layers,
}

const STATUS_COLORS: Record<IssueStatus, string> = {
  TODO: 'bg-gray-500',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-yellow-500',
  DONE: 'bg-green-500',
}

const TimelinePreviewCard = ({ projectId, projectKey, issues }: Props) => {
  // Calculate date range for mini timeline (next 4 weeks)
  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + 28)

  // Filter issues within the range
  const upcomingIssues = issues.filter((issue) => {
    const issueDate = issue.dueDate ? new Date(issue.dueDate) : issue.startDate ? new Date(issue.startDate) : null
    return issueDate && issueDate >= today && issueDate <= endDate
  }).slice(0, 4)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Upcoming
        </CardTitle>
        <Badge variant="secondary">Next 4 weeks</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcomingIssues.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
          </div>
        ) : (
          <>
            {upcomingIssues.map((issue) => {
              const TypeIcon = TYPE_ICONS[issue.type]
              const displayDate = issue.dueDate || issue.startDate
              
              return (
                <Link
                  key={issue.id}
                  href={`/projects/${projectId}/issues/${issue.id}`}
                  className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <div className={cn("w-1 h-8 rounded-full", STATUS_COLORS[issue.status])} />
                  <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate group-hover:text-primary transition-colors">
                      {issue.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {projectKey}-{issue.number}
                    </p>
                  </div>
                  {displayDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                      <Calendar className="h-3 w-3" />
                      {formatDate(displayDate)}
                    </div>
                  )}
                </Link>
              )
            })}

            {issues.length > upcomingIssues.length && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                + {issues.length - upcomingIssues.length} more scheduled
              </p>
            )}
          </>
        )}

        <Link href={`/projects/${projectId}/timeline`} className="block pt-2">
          <Button variant="ghost" size="sm" className="w-full justify-between">
            View Timeline
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default TimelinePreviewCard
