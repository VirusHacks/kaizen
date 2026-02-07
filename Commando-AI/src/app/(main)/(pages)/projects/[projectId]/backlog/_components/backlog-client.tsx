'use client'

import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Layers } from 'lucide-react'
import BacklogSection from './backlog-section'
import SprintSection from './sprint-section'
import BacklogIssueCard from './backlog-issue-card'
import SprintForm from './sprint-form'
import AISprintPlannerButton from './ai-sprint-planner-button'
import {
  moveIssueToSprint,
  removeIssueFromSprint,
  startSprint,
  completeSprint,
} from '../../sprints/_actions/sprint-actions'

// Types
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
  reporter?: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  }
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
  initialBacklog: BacklogIssue[]
  initialSprints: Sprint[]
  projectId: string
  projectKey: string
}

const BacklogClient = ({
  initialBacklog,
  initialSprints,
  projectId,
  projectKey,
}: Props) => {
  const router = useRouter()
  const [backlog, setBacklog] = useState<BacklogIssue[]>(initialBacklog)
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
  const [activeIssue, setActiveIssue] = useState<BacklogIssue | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [sprintFormOpen, setSprintFormOpen] = useState(false)

  // Filter sprints by status
  const activeSprints = sprints.filter((s) => s.status === 'ACTIVE')
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED')
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED')

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    // Find issue in backlog or any sprint
    let issue = backlog.find((i) => i.id === active.id)
    if (!issue) {
      for (const sprint of sprints) {
        issue = sprint.issues.find((i) => i.id === active.id)
        if (issue) break
      }
    }
    if (issue) {
      setActiveIssue(issue)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveIssue(null)

    if (!over) return

    const activeIssueId = active.id as string
    const overId = over.id as string

    // Determine source and target
    const isBacklogTarget = overId === 'backlog' || backlog.some((i) => i.id === overId)
    const targetSprintId = !isBacklogTarget
      ? sprints.find(
          (s) => s.id === overId || s.issues.some((i) => i.id === overId)
        )?.id
      : null

    // Find the source of the issue
    let sourceSprintId: string | null = null
    let sourceIssue = backlog.find((i) => i.id === activeIssueId)
    if (!sourceIssue) {
      for (const sprint of sprints) {
        const found = sprint.issues.find((i) => i.id === activeIssueId)
        if (found) {
          sourceIssue = found
          sourceSprintId = sprint.id
          break
        }
      }
    }

    if (!sourceIssue) return

    // No change if same location
    if (
      (isBacklogTarget && !sourceSprintId) ||
      (!isBacklogTarget && targetSprintId === sourceSprintId)
    ) {
      return
    }

    // Optimistic update
    const previousBacklog = [...backlog]
    const previousSprints = [...sprints]

    if (isBacklogTarget && sourceSprintId) {
      // Moving from sprint to backlog
      setSprints((prev) =>
        prev.map((s) =>
          s.id === sourceSprintId
            ? { ...s, issues: s.issues.filter((i) => i.id !== activeIssueId) }
            : s
        )
      )
      setBacklog((prev) => [...prev, { ...sourceIssue!, sprintId: null }])
    } else if (targetSprintId && !sourceSprintId) {
      // Moving from backlog to sprint
      setBacklog((prev) => prev.filter((i) => i.id !== activeIssueId))
      setSprints((prev) =>
        prev.map((s) =>
          s.id === targetSprintId
            ? { ...s, issues: [...s.issues, { ...sourceIssue!, sprintId: targetSprintId }] }
            : s
        )
      )
    } else if (targetSprintId && sourceSprintId) {
      // Moving between sprints
      setSprints((prev) =>
        prev.map((s) => {
          if (s.id === sourceSprintId) {
            return { ...s, issues: s.issues.filter((i) => i.id !== activeIssueId) }
          }
          if (s.id === targetSprintId) {
            return { ...s, issues: [...s.issues, { ...sourceIssue!, sprintId: targetSprintId }] }
          }
          return s
        })
      )
    }

    setIsUpdating(true)

    try {
      let result
      if (isBacklogTarget) {
        result = await removeIssueFromSprint(activeIssueId)
      } else if (targetSprintId) {
        result = await moveIssueToSprint(activeIssueId, targetSprintId)
      }

      if (result?.error) {
        setBacklog(previousBacklog)
        setSprints(previousSprints)
        toast.error(result.error)
      } else {
        toast.success(result?.message || 'Issue moved')
        router.refresh()
      }
    } catch (error) {
      setBacklog(previousBacklog)
      setSprints(previousSprints)
      toast.error('Failed to move issue')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCreateSprint = () => {
    setSprintFormOpen(true)
  }

  const handleStartSprint = async (sprintId: string) => {
    setIsUpdating(true)
    try {
      const result = await startSprint(sprintId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        router.refresh()
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCompleteSprint = async (sprintId: string) => {
    setIsUpdating(true)
    try {
      const result = await completeSprint(sprintId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        router.refresh()
      }
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-[10] p-6 bg-background/50 backdrop-blur-lg border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Backlog</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Plan and organize your work into sprints
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AISprintPlannerButton
                projectId={projectId}
                hasPlannedSprint={plannedSprints.length > 0}
                plannedSprintId={plannedSprints[0]?.id}
              />
              <Button onClick={handleCreateSprint}>
                <Plus className="h-4 w-4 mr-2" />
                Create Sprint
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Sprint */}
          {activeSprints.map((sprint) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              projectId={projectId}
              projectKey={projectKey}
              isUpdating={isUpdating}
              variant="active"
              onComplete={() => handleCompleteSprint(sprint.id)}
            />
          ))}

          {/* Planned Sprints */}
          {plannedSprints.map((sprint) => (
            <SprintSection
              key={sprint.id}
              sprint={sprint}
              projectId={projectId}
              projectKey={projectKey}
              isUpdating={isUpdating}
              variant="planned"
              onStart={() => handleStartSprint(sprint.id)}
            />
          ))}

          {/* Backlog Section */}
          <BacklogSection
            issues={backlog}
            projectId={projectId}
            projectKey={projectKey}
            isUpdating={isUpdating}
          />

          {/* Completed Sprints (collapsed) */}
          {completedSprints.length > 0 && (
            <div className="pt-6 border-t">
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Completed Sprints ({completedSprints.length})
              </h3>
              {completedSprints.slice(0, 3).map((sprint) => (
                <SprintSection
                  key={sprint.id}
                  sprint={sprint}
                  projectId={projectId}
                  projectKey={projectKey}
                  isUpdating={isUpdating}
                  variant="completed"
                  collapsed
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeIssue && (
          <BacklogIssueCard
            issue={activeIssue}
            projectId={projectId}
            projectKey={projectKey}
            isDragging
          />
        )}
      </DragOverlay>

      {/* Create Sprint Form */}
      <SprintForm
        projectId={projectId}
        open={sprintFormOpen}
        onOpenChange={setSprintFormOpen}
        onSuccess={() => router.refresh()}
      />
    </DndContext>
  )
}

export default BacklogClient
