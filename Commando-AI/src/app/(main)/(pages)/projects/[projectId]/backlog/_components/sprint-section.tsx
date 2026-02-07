'use client'

import React, { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Target,
  MoreHorizontal,
  Trash2,
  Edit,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import BacklogIssueCard from './backlog-issue-card'
import { deleteSprint } from '../../sprints/_actions/sprint-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import SprintForm from './sprint-form'

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

type Sprint = {
  id: string
  name: string
  goal: string | null
  startDate: Date | null
  endDate: Date | null
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'
  issues: BacklogIssue[]
  _count: {
    issues: number
  }
}

type Props = {
  sprint: Sprint
  projectId: string
  projectKey: string
  isUpdating?: boolean
  variant: 'active' | 'planned' | 'completed'
  collapsed?: boolean
  onStart?: () => void
  onComplete?: () => void
}

const SprintSection = ({
  sprint,
  projectId,
  projectKey,
  isUpdating,
  variant,
  collapsed: initialCollapsed = false,
  onStart,
  onComplete,
}: Props) => {
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: sprint.id,
    disabled: variant === 'completed',
  })

  const statusColors = {
    active: 'bg-green-500',
    planned: 'bg-blue-500',
    completed: 'bg-gray-500',
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const handleDelete = async () => {
    const result = await deleteSprint(sprint.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message)
      router.refresh()
    }
    setShowDeleteDialog(false)
  }

  const handleEdit = () => {
    setShowEditForm(true)
  }

  const incompleteIssues = sprint.issues.filter((i) => i.status !== 'DONE').length

  return (
    <>
      <div
        ref={setNodeRef}
        className={cn(
          'rounded-lg border transition-colors',
          variant === 'active' && 'border-green-500/30 bg-green-500/5',
          variant === 'planned' && 'border-blue-500/30 bg-blue-500/5',
          variant === 'completed' && 'bg-muted/10',
          isOver && variant !== 'completed' && 'border-primary/50 bg-primary/5',
          isUpdating && 'opacity-70 pointer-events-none'
        )}
      >
        {/* Section Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-muted rounded"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            <div className={cn('w-2 h-2 rounded-full', statusColors[variant])} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{sprint.name}</h3>
                <Badge
                  variant={variant === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {variant === 'active'
                    ? 'Active'
                    : variant === 'planned'
                    ? 'Planned'
                    : 'Completed'}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {sprint.issues.length} issue{sprint.issues.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                {sprint.goal && (
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {sprint.goal}
                  </span>
                )}
                {(sprint.startDate || sprint.endDate) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {variant === 'planned' && onStart && (
              <Button size="sm" onClick={onStart} disabled={sprint.issues.length === 0}>
                <Play className="h-3.5 w-3.5 mr-1" />
                Start Sprint
              </Button>
            )}
            {variant === 'active' && onComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCompleteDialog(true)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Complete Sprint
              </Button>
            )}
            {variant !== 'completed' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Sprint
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-600"
                    disabled={variant === 'active'}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Sprint
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Issues */}
        {!isCollapsed && (
          <div className="p-2">
            <SortableContext
              items={sprint.issues.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {sprint.issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No issues in this sprint</p>
                  <p className="text-xs">Drag issues here from the backlog</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sprint.issues.map((issue) => (
                    <BacklogIssueCard
                      key={issue.id}
                      issue={issue}
                      projectId={projectId}
                      projectKey={projectKey}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sprint</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sprint.name}"? All issues will be moved
              back to the backlog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Sprint Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Sprint</AlertDialogTitle>
            <AlertDialogDescription>
              {incompleteIssues > 0 ? (
                <>
                  {incompleteIssues} issue{incompleteIssues !== 1 ? 's are' : ' is'} not
                  done and will be moved back to the backlog.
                </>
              ) : (
                'All issues in this sprint are complete!'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onComplete?.()
                setShowCompleteDialog(false)
              }}
            >
              Complete Sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Sprint Form */}
      <SprintForm
        projectId={projectId}
        open={showEditForm}
        onOpenChange={setShowEditForm}
        sprint={{
          id: sprint.id,
          name: sprint.name,
          goal: sprint.goal,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
        }}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

export default SprintSection
