'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Zap,
  Target,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  projectId: string
  sprint: {
    id: string
    name: string
    goal: string | null
    startDate: string | null
    endDate: string | null
    totalIssues: number
    completedIssues: number
    inProgressIssues: number
  } | null
}

const SprintCard = ({ projectId, sprint }: Props) => {
  if (!sprint) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Active Sprint
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No active sprint</p>
            <Link href={`/projects/${projectId}/backlog`}>
              <Button variant="outline" size="sm">
                Start a Sprint
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progress = sprint.totalIssues > 0
    ? Math.round((sprint.completedIssues / sprint.totalIssues) * 100)
    : 0

  const todoIssues = sprint.totalIssues - sprint.completedIssues - sprint.inProgressIssues

  // Calculate days remaining
  const daysRemaining = sprint.endDate
    ? Math.max(0, Math.ceil((new Date(sprint.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null

  const isOverdue = daysRemaining !== null && daysRemaining === 0 && progress < 100

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Active Sprint
        </CardTitle>
        <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20">
          Active
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sprint name and goal */}
        <div>
          <h3 className="font-semibold">{sprint.name}</h3>
          {sprint.goal && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              <Target className="h-3 w-3 inline mr-1" />
              {sprint.goal}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{sprint.completedIssues} done</span>
            <span>{sprint.inProgressIssues} in progress</span>
            <span>{todoIssues} to do</span>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {sprint.startDate && (
              <span>
                {new Date(sprint.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {sprint.startDate && sprint.endDate && <span>→</span>}
            {sprint.endDate && (
              <span>
                {new Date(sprint.endDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
          {daysRemaining !== null && (
            <Badge 
              variant={isOverdue ? 'destructive' : 'secondary'}
              className="gap-1"
            >
              {isOverdue ? (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Overdue
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  {daysRemaining} days left
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Link */}
        <Link href={`/projects/${projectId}/backlog`}>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            View Sprint
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default SprintCard
