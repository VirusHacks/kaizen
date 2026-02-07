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
  TODO: { label: 'To Do', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  IN_REVIEW: { label: 'Review', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  DONE: { label: 'Done', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
}

const BoardPreviewCard = ({ projectId, snapshot }: Props) => {
  const totalIssues = Object.values(snapshot).reduce((a, b) => a + b, 0)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
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
                <p className={cn("text-2xl font-bold", config.color)}>
                  {count}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium truncate">
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

        <Link href={`/projects/${projectId}/board`}>
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
