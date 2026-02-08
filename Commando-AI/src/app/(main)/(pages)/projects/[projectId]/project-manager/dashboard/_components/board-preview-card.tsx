'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LayoutGrid, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IssueStatus } from '@prisma/client'

type Props = {
  projectId: string
  snapshot: Record<IssueStatus, number>
}

const STATUS_CONFIG: Record<IssueStatus, { label: string; color: string; bgColor: string }> = {
  TODO: { label: 'To Do', color: 'text-gray-400', bgColor: 'bg-muted' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  IN_REVIEW: { label: 'Review', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  DONE: { label: 'Done', color: 'text-green-500', bgColor: 'bg-green-500/10' },
}

const BoardPreviewCard = ({ projectId, snapshot }: Props) => {
  const totalIssues = Object.values(snapshot).reduce((a, b) => a + b, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          Board Overview
        </CardTitle>
        <Badge variant="secondary">{totalIssues} issues</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Kanban Preview */}
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(STATUS_CONFIG) as IssueStatus[]).map((status) => {
            const config = STATUS_CONFIG[status]
            const count = snapshot[status]
            
            return (
              <div
                key={status}
                className={cn(
                  "rounded-lg p-2 text-center",
                  config.bgColor
                )}
              >
                <p className={cn("text-xl font-bold", config.color)}>
                  {count}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {config.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* Visual bar */}
        {totalIssues > 0 && (
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
            {(Object.keys(STATUS_CONFIG) as IssueStatus[]).map((status) => {
              const count = snapshot[status]
              const percentage = (count / totalIssues) * 100
              if (percentage === 0) return null
              
              const colors: Record<IssueStatus, string> = {
                TODO: 'bg-gray-400',
                IN_PROGRESS: 'bg-blue-500',
                IN_REVIEW: 'bg-yellow-500',
                DONE: 'bg-green-500',
              }
              
              return (
                <div
                  key={status}
                  className={cn("h-full", colors[status])}
                  style={{ width: `${percentage}%` }}
                />
              )
            })}
          </div>
        )}

        <Link href={`/projects/${projectId}/project-manager/board`}>
          <Button variant="ghost" size="sm" className="w-full justify-between">
            Open Board
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default BoardPreviewCard
