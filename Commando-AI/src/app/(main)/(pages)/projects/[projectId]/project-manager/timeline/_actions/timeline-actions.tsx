'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

/**
 * Get timeline data for a project
 * Returns issues with dates, grouped by sprint or assignee
 */
export const getTimelineData = async (
  projectId: string,
  groupBy: 'sprint' | 'assignee' | 'status' = 'sprint'
) => {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check if user has access to the project
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    })

    if (!project) {
      return { error: 'Project not found or access denied', data: null }
    }

    // Get all issues with dates
    const issues = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
        OR: [
          { startDate: { not: null } },
          { dueDate: { not: null } },
        ],
      },
      include: {
        assignee: {
          select: {
            clerkId: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        sprint: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
      orderBy: [
        { startDate: 'asc' },
        { dueDate: 'asc' },
      ],
    })

    // Get all sprints for the project
    const sprints = await db.sprint.findMany({
      where: { projectId },
      orderBy: { startDate: 'asc' },
    })

    // Calculate date range
    let minDate: Date | null = null
    let maxDate: Date | null = null

    for (const issue of issues) {
      const start = issue.startDate || issue.createdAt
      const end = issue.dueDate || start

      if (!minDate || start < minDate) minDate = start
      if (!maxDate || end > maxDate) maxDate = end
    }

    // Include sprint dates in range
    for (const sprint of sprints) {
      if (sprint.startDate && (!minDate || sprint.startDate < minDate)) {
        minDate = sprint.startDate
      }
      if (sprint.endDate && (!maxDate || sprint.endDate > maxDate)) {
        maxDate = sprint.endDate
      }
    }

    // Default range if no dates
    if (!minDate) minDate = new Date()
    if (!maxDate) maxDate = new Date(minDate.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Format issues for timeline
    const timelineIssues = issues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      type: issue.type,
      status: issue.status,
      priority: issue.priority,
      startDate: issue.startDate?.toISOString() || issue.createdAt.toISOString(),
      endDate: issue.dueDate?.toISOString() || null,
      assignee: issue.assignee,
      sprint: issue.sprint ? {
        id: issue.sprint.id,
        name: issue.sprint.name,
        startDate: issue.sprint.startDate?.toISOString() || null,
        endDate: issue.sprint.endDate?.toISOString() || null,
        status: issue.sprint.status,
      } : null,
      projectKey: project.key,
    }))

    return {
      data: {
        issues: timelineIssues,
        sprints: sprints.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate?.toISOString() || null,
          endDate: s.endDate?.toISOString() || null,
          status: s.status,
        })),
        dateRange: {
          start: minDate.toISOString(),
          end: maxDate.toISOString(),
        },
        project: {
          id: project.id,
          name: project.name,
          key: project.key,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('[GET_TIMELINE_DATA]', error)
    return { error: 'Failed to fetch timeline data', data: null }
  }
}

/**
 * Update issue dates for timeline drag
 */
export const updateIssueDates = async (
  issueId: string,
  startDate: string | null,
  dueDate: string | null
) => {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Get the issue and check access
    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: {
        project: {
          select: {
            id: true,
            ownerId: true,
            members: { select: { userId: true, role: true } },
          },
        },
      },
    })

    if (!issue) {
      return { error: 'Issue not found', data: null }
    }

    // Check if user can edit (owner, admin, or member)
    const isOwner = issue.project.ownerId === userId
    const membership = issue.project.members.find((m) => m.userId === userId)
    const canEdit = isOwner || (membership && membership.role !== 'VIEWER')

    if (!canEdit) {
      return { error: 'You do not have permission to edit this issue', data: null }
    }

    const updatedIssue = await db.issue.update({
      where: { id: issueId },
      data: {
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    })

    return { data: updatedIssue, error: null }
  } catch (error) {
    console.error('[UPDATE_ISSUE_DATES]', error)
    return { error: 'Failed to update issue dates', data: null }
  }
}
