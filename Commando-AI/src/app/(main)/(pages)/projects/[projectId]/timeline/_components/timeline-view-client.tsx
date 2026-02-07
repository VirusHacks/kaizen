'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Calendar,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Target,
  Bug,
  BookOpen,
  CheckSquare,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { IssueStatus, IssueType, IssuePriority, SprintStatus } from '@prisma/client'

// Types
type TimelineIssue = {
  id: string
  number: number
  title: string
  type: IssueType
  status: IssueStatus
  priority: IssuePriority
  startDate: string
  endDate: string | null
  projectKey: string
  assignee: {
    clerkId: string
    name: string | null
    email: string
    profileImage: string | null
  } | null
  sprint: {
    id: string
    name: string
    startDate: string | null
    endDate: string | null
    status: SprintStatus
  } | null
}

type TimelineSprint = {
  id: string
  name: string
  startDate: string | null
  endDate: string | null
  status: SprintStatus
}

type Props = {
  projectId: string
  projectName: string
  projectKey: string
  issues: TimelineIssue[]
  sprints: TimelineSprint[]
  dateRange: {
    start: string
    end: string
  }
}

// Status colors
const STATUS_COLORS: Record<IssueStatus, string> = {
  TODO: '#6B7280',
  IN_PROGRESS: '#3B82F6',
  IN_REVIEW: '#EAB308',
  DONE: '#22C55E',
}

// Issue type icons
const TYPE_ICONS: Record<IssueType, React.ElementType> = {
  EPIC: Target,
  STORY: BookOpen,
  TASK: CheckSquare,
  BUG: Bug,
  SUBTASK: Layers,
}

// Zoom levels (days per cell)
type ZoomLevel = 'day' | 'week' | 'month'
const ZOOM_CONFIG: Record<ZoomLevel, { days: number; format: Intl.DateTimeFormatOptions; cellWidth: number }> = {
  day: { days: 1, format: { day: 'numeric' }, cellWidth: 40 },
  week: { days: 7, format: { day: 'numeric', month: 'short' }, cellWidth: 100 },
  month: { days: 30, format: { month: 'short', year: '2-digit' }, cellWidth: 120 },
}

const TimelineViewClient = ({
  projectId,
  projectName,
  projectKey,
  issues,
  sprints,
  dateRange,
}: Props) => {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<ZoomLevel>('week')
  const [groupBy, setGroupBy] = useState<'sprint' | 'assignee' | 'none'>('sprint')

  // Calculate timeline dimensions
  const { dates, totalWidth, startDate, endDate } = useMemo(() => {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    
    // Add padding (2 weeks before and after)
    start.setDate(start.getDate() - 14)
    end.setDate(end.getDate() + 14)

    const dates: Date[] = []
    const config = ZOOM_CONFIG[zoom]
    const current = new Date(start)

    // eslint-disable-next-line no-unmodified-loop-condition
    while (current <= end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + config.days)
    }

    return {
      dates,
      totalWidth: dates.length * config.cellWidth,
      startDate: start,
      endDate: end,
    }
  }, [dateRange, zoom])

  // Calculate position for a date
  const getPositionForDate = (date: Date): number => {
    const config = ZOOM_CONFIG[zoom]
    const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return (daysDiff / config.days) * config.cellWidth
  }

  // Group issues
  const groupedIssues = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Issues', issues }]
    }

    if (groupBy === 'sprint') {
      const groups: { key: string; label: string; issues: TimelineIssue[] }[] = []
      const sprintMap = new Map<string, TimelineIssue[]>()
      const backlog: TimelineIssue[] = []

      for (const issue of issues) {
        if (issue.sprint) {
          const existing = sprintMap.get(issue.sprint.id) || []
          sprintMap.set(issue.sprint.id, [...existing, issue])
        } else {
          backlog.push(issue)
        }
      }

      // Add sprint groups
      for (const sprint of sprints) {
        const sprintIssues = sprintMap.get(sprint.id) || []
        if (sprintIssues.length > 0) {
          groups.push({
            key: sprint.id,
            label: sprint.name,
            issues: sprintIssues,
          })
        }
      }

      // Add backlog
      if (backlog.length > 0) {
        groups.push({ key: 'backlog', label: 'Backlog', issues: backlog })
      }

      return groups
    }

    if (groupBy === 'assignee') {
      const groups: { key: string; label: string; issues: TimelineIssue[] }[] = []
      const assigneeMap = new Map<string, { user: TimelineIssue['assignee']; issues: TimelineIssue[] }>()
      const unassigned: TimelineIssue[] = []

      for (const issue of issues) {
        if (issue.assignee) {
          const existing = assigneeMap.get(issue.assignee.clerkId)
          if (existing) {
            existing.issues.push(issue)
          } else {
            assigneeMap.set(issue.assignee.clerkId, {
              user: issue.assignee,
              issues: [issue],
            })
          }
        } else {
          unassigned.push(issue)
        }
      }

      // Add assignee groups
      Array.from(assigneeMap.entries()).forEach(([id, data]) => {
        groups.push({
          key: id,
          label: data.user?.name || data.user?.email || 'Unknown',
          issues: data.issues,
        })
      })

      // Add unassigned
      if (unassigned.length > 0) {
        groups.push({ key: 'unassigned', label: 'Unassigned', issues: unassigned })
      }

      return groups
    }

    return []
  }, [issues, sprints, groupBy])

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current) {
      const todayPosition = getPositionForDate(new Date())
      scrollRef.current.scrollLeft = Math.max(0, todayPosition - 200)
    }
  }, [])

  // Today marker position
  const todayPosition = getPositionForDate(new Date())

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </h2>
          <p className="text-sm text-muted-foreground">
            {issues.length} issues with dates in {projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sprint">By Sprint</SelectItem>
              <SelectItem value="assignee">By Assignee</SelectItem>
              <SelectItem value="none">No Grouping</SelectItem>
            </SelectContent>
          </Select>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(zoom === 'month' ? 'week' : 'day')}
              disabled={zoom === 'day'}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2 capitalize">{zoom}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(zoom === 'day' ? 'week' : 'month')}
              disabled={zoom === 'month'}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollLeft = Math.max(0, todayPosition - 200)
              }
            }}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Today
          </Button>
        </div>
      </div>

      {/* Timeline Content */}
      {issues.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No issues with dates</p>
            <p className="text-sm">Add start dates or due dates to issues to see them on the timeline.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Issue Labels */}
          <div className="w-[250px] border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
            {/* Header spacer */}
            <div className="h-10 border-b bg-muted/50" />

            {/* Groups */}
            {groupedIssues.map((group) => (
              <div key={group.key}>
                {/* Group Header */}
                <div className="h-8 px-3 flex items-center bg-muted/50 border-b font-medium text-sm">
                  {group.label}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {group.issues.length}
                  </Badge>
                </div>

                {/* Issues in group */}
                {group.issues.map((issue) => {
                  const Icon = TYPE_ICONS[issue.type]
                  return (
                    <Link
                      key={issue.id}
                      href={`/projects/${projectId}/issues/${issue.id}`}
                      className="h-10 px-3 flex items-center gap-2 border-b hover:bg-muted/50 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground font-mono">
                        {projectKey}-{issue.number}
                      </span>
                      <span className="text-sm truncate flex-1">{issue.title}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Right - Timeline Grid */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div style={{ width: totalWidth, minWidth: '100%' }}>
              {/* Date Headers */}
              <div className="h-10 flex border-b bg-muted/50 sticky top-0 z-10">
                {dates.map((date, i) => {
                  const config = ZOOM_CONFIG[zoom]
                  const isToday =
                    date.toDateString() === new Date().toDateString() ||
                    (zoom !== 'day' &&
                      date <= new Date() &&
                      new Date(date.getTime() + config.days * 24 * 60 * 60 * 1000) > new Date())

                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex-shrink-0 flex items-center justify-center text-xs border-r',
                        isToday && 'bg-primary/10 font-semibold'
                      )}
                      style={{ width: config.cellWidth }}
                    >
                      {date.toLocaleDateString('en-US', config.format)}
                    </div>
                  )
                })}
              </div>

              {/* Groups and Bars */}
              <div className="relative">
                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                  style={{ left: todayPosition }}
                />

                {groupedIssues.map((group) => (
                  <div key={group.key}>
                    {/* Group Header Row */}
                    <div className="h-8 border-b bg-muted/30 relative">
                      {/* Sprint bar if grouped by sprint */}
                      {groupBy === 'sprint' && group.key !== 'backlog' && (
                        (() => {
                          const sprint = sprints.find((s) => s.id === group.key)
                          if (sprint?.startDate && sprint?.endDate) {
                            const sprintStart = getPositionForDate(new Date(sprint.startDate))
                            const sprintEnd = getPositionForDate(new Date(sprint.endDate))
                            return (
                              <div
                                className="absolute top-1 bottom-1 rounded bg-primary/20 border border-primary/30"
                                style={{
                                  left: sprintStart,
                                  width: sprintEnd - sprintStart,
                                }}
                              />
                            )
                          }
                          return null
                        })()
                      )}
                    </div>

                    {/* Issue Rows */}
                    {group.issues.map((issue) => {
                      const issueStart = new Date(issue.startDate)
                      const issueEnd = issue.endDate ? new Date(issue.endDate) : issueStart
                      const startPos = getPositionForDate(issueStart)
                      const endPos = getPositionForDate(issueEnd)
                      const width = Math.max(endPos - startPos, 20)

                      return (
                        <div key={issue.id} className="h-10 border-b relative">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  href={`/projects/${projectId}/issues/${issue.id}`}
                                  className="absolute top-1.5 h-7 rounded flex items-center px-2 gap-1.5 text-xs text-white cursor-pointer hover:brightness-110 transition-all"
                                  style={{
                                    left: startPos,
                                    width,
                                    backgroundColor: STATUS_COLORS[issue.status],
                                  }}
                                >
                                  {width > 60 && (
                                    <>
                                      <span className="font-mono opacity-80">
                                        {projectKey}-{issue.number}
                                      </span>
                                      {width > 150 && (
                                        <span className="truncate">{issue.title}</span>
                                      )}
                                    </>
                                  )}
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">
                                    {projectKey}-{issue.number}: {issue.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs">
                                    <Badge
                                      variant="secondary"
                                      style={{
                                        backgroundColor: `${STATUS_COLORS[issue.status]}30`,
                                        color: STATUS_COLORS[issue.status],
                                      }}
                                    >
                                      {issue.status.replace('_', ' ')}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {new Date(issue.startDate).toLocaleDateString()}
                                      {issue.endDate && (
                                        <> → {new Date(issue.endDate).toLocaleDateString()}</>
                                      )}
                                    </span>
                                  </div>
                                  {issue.assignee && (
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <Avatar className="h-4 w-4">
                                        <AvatarImage src={issue.assignee.profileImage || undefined} />
                                        <AvatarFallback className="text-[8px]">
                                          {issue.assignee.name?.[0] || '?'}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{issue.assignee.name || issue.assignee.email}</span>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimelineViewClient
