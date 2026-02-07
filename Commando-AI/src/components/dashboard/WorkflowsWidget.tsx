'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Workflow, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface WorkflowItem {
  id: string
  name: string
  description: string
  publish: boolean | null
  createdAt: string
  updatedAt: string
}

interface WorkflowsWidgetProps {
  data: {
    workflows: WorkflowItem[]
    totalCount: number
    activeCount: number
  } | null
  error: string | null
  onRefresh?: () => void
}

export function WorkflowsWidget({ data, error, onRefresh }: WorkflowsWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    if (onRefresh) {
      await onRefresh()
    }
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  if (error) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4" />
            Workflows
          </CardTitle>
          <CardDescription className="text-xs mt-1">Automation workflows</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="text-xs text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-4 w-4" />
            Workflows
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pt-0">
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const workflows = data.workflows || []
  const activeCount = data.activeCount || 0
  const totalCount = data.totalCount || 0
  const activeWorkflows = workflows.filter((w) => w.publish === true)

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-shrink-0 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            <CardTitle className="text-base">Active Workflows</CardTitle>
            {activeCount > 0 && (
              <Badge variant="default" className="ml-1.5 text-xs px-1.5 py-0 h-5">
                {activeCount}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 w-7"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-sm mt-0.5">
          {totalCount > 0 ? `${totalCount} total workflow${totalCount > 1 ? 's' : ''}` : 'No workflows yet'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-0 px-4 pb-3">
        {activeWorkflows.length === 0 ? (
          <div className="text-center py-2 text-xs text-muted-foreground">
            <Workflow className="h-5 w-5 mx-auto mb-1 opacity-50" />
            <p>No active workflows</p>
            <Link href="/workflows">
              <Button variant="outline" size="sm" className="mt-2 text-xs h-6">
                Create Workflow
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {activeWorkflows.slice(0, 3).map((workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/editor/${workflow.id}`}
                className="block p-1.5 rounded-md border hover:bg-accent/50 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-medium truncate flex-1">{workflow.name}</p>
                  <Badge variant="default" className="text-[0.65rem] px-1.5 py-0 h-4 ml-2">
                    Active
                  </Badge>
                </div>
                {workflow.description && (
                  <p className="text-[0.65rem] text-muted-foreground line-clamp-1">
                    {workflow.description}
                  </p>
                )}
              </Link>
            ))}
            {activeWorkflows.length > 3 && (
              <Link href="/workflows">
                <Button variant="outline" size="sm" className="w-full mt-1 text-xs h-6">
                  View All ({totalCount})
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

