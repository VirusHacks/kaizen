'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Activity, ArrowRight, Clock, CheckCircle2, Circle, RefreshCw, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IssueStatus } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'

type ActivityItem = {
  id: string
  number: number
  title: string
  status: IssueStatus
  updatedAt: string
  assignee: {
    clerkId: string
    name: string | null
    profileImage: string | null
  } | null
}

type Props = {
  projectId: string
  projectKey: string
  activities: ActivityItem[]
}

const STATUS_CONFIG: Record<IssueStatus, { icon: React.ElementType; color: string; label: string }> = {
  TODO: { icon: Circle, color: 'text-gray-500', label: 'To Do' },
  IN_PROGRESS: { icon: RefreshCw, color: 'text-blue-500', label: 'In Progress' },
  IN_REVIEW: { icon: Eye, color: 'text-yellow-500', label: 'In Review' },
  DONE: { icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
}

const ActivityFeedCard = ({ projectId, projectKey, activities }: Props) => {
  return (
    <Card className="col-span-full md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
        <Badge variant="secondary">{activities.length} updates</Badge>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((activity, index) => {
              const statusConfig = STATUS_CONFIG[activity.status]
              const StatusIcon = statusConfig.icon

              return (
                <Link
                  key={activity.id}
                  href={`/projects/${projectId}/issues/${activity.id}`}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group",
                    index !== activities.length - 1 && "border-b border-dashed"
                  )}
                >
                  {/* Status Icon */}
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    activity.status === 'DONE' ? 'bg-green-500/10' : 
                    activity.status === 'IN_PROGRESS' ? 'bg-blue-500/10' :
                    activity.status === 'IN_REVIEW' ? 'bg-yellow-500/10' : 'bg-gray-500/10'
                  )}>
                    <StatusIcon className={cn("h-4 w-4", statusConfig.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">
                        {projectKey}-{activity.number}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] px-1 py-0", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm truncate group-hover:text-primary transition-colors">
                      {activity.title}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {activity.assignee && (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={activity.assignee.profileImage || undefined} />
                        <AvatarFallback className="text-[8px]">
                          {activity.assignee.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ActivityFeedCard
