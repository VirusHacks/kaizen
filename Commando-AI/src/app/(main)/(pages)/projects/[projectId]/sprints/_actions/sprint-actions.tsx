'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { SprintFormSchema, UpdateSprintSchema, SprintStatusEnum } from '@/lib/types'

/**
 * Get the current user ID using auth()
 */
const getCurrentUserId = async () => {
  const { userId } = await auth()
  return userId
}

/**
 * Check if user has access to a project (is owner)
 */
const checkProjectAccess = async (projectId: string, userId: string) => {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
  })
  return project
}

/**
 * Get all sprints for a project
 */
export const getProjectSprints = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { error: 'Project not found or access denied', data: null }
    }

    const sprints = await db.sprint.findMany({
      where: { projectId },
      include: {
        issues: {
          where: { isArchived: false },
          include: {
            assignee: {
              select: {
                clerkId: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: { issues: true },
        },
      },
      orderBy: [
        { status: 'asc' }, // Active first, then Planned, then Completed
        { startDate: 'asc' },
      ],
    })

    return { data: sprints, error: null, project }
  } catch (error) {
    console.error('[GET_PROJECT_SPRINTS]', error)
    return { error: 'Failed to fetch sprints', data: null }
  }
}

/**
 * Get a single sprint by ID
 */
export const getSprintById = async (sprintId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: true,
        issues: {
          where: { isArchived: false },
          include: {
            assignee: {
              select: {
                clerkId: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
            reporter: {
              select: {
                clerkId: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: { issues: true },
        },
      },
    })

    if (!sprint) {
      return { error: 'Sprint not found', data: null }
    }

    // Check project access
    const hasAccess = await checkProjectAccess(sprint.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    return { data: sprint, error: null }
  } catch (error) {
    console.error('[GET_SPRINT_BY_ID]', error)
    return { error: 'Failed to fetch sprint', data: null }
  }
}

/**
 * Get active sprint for a project
 */
export const getActiveSprint = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { error: 'Project not found or access denied', data: null }
    }

    const sprint = await db.sprint.findFirst({
      where: {
        projectId,
        status: 'ACTIVE',
      },
      include: {
        issues: {
          where: { isArchived: false },
          include: {
            assignee: {
              select: {
                clerkId: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
          orderBy: [{ status: 'asc' }, { priority: 'desc' }],
        },
        _count: {
          select: { issues: true },
        },
      },
    })

    return { data: sprint, error: null }
  } catch (error) {
    console.error('[GET_ACTIVE_SPRINT]', error)
    return { error: 'Failed to fetch active sprint', data: null }
  }
}

/**
 * Get backlog issues (issues without a sprint)
 */
export const getBacklogIssues = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { error: 'Project not found or access denied', data: null }
    }

    const issues = await db.issue.findMany({
      where: {
        projectId,
        sprintId: null,
        isArchived: false,
        parentId: null, // Only top-level issues
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
        reporter: {
          select: {
            clerkId: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        _count: {
          select: { children: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return { data: issues, error: null, project }
  } catch (error) {
    console.error('[GET_BACKLOG_ISSUES]', error)
    return { error: 'Failed to fetch backlog', data: null }
  }
}

/**
 * Create a new sprint
 */
export const createSprint = async (
  projectId: string,
  values: z.infer<typeof SprintFormSchema>
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const validatedFields = SprintFormSchema.safeParse(values)
    if (!validatedFields.success) {
      return { error: 'Invalid fields', data: null }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { error: 'Project not found or access denied', data: null }
    }

    const sprint = await db.sprint.create({
      data: {
        name: validatedFields.data.name,
        goal: validatedFields.data.goal || null,
        startDate: validatedFields.data.startDate || null,
        endDate: validatedFields.data.endDate || null,
        projectId,
      },
    })

    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/backlog`)

    return {
      data: sprint,
      error: null,
      message: `Sprint "${sprint.name}" created successfully`,
    }
  } catch (error) {
    console.error('[CREATE_SPRINT]', error)
    return { error: 'Failed to create sprint', data: null }
  }
}

/**
 * Update a sprint
 */
export const updateSprint = async (
  sprintId: string,
  values: z.infer<typeof UpdateSprintSchema>
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const existingSprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: { project: true },
    })

    if (!existingSprint) {
      return { error: 'Sprint not found', data: null }
    }

    const hasAccess = await checkProjectAccess(existingSprint.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    const validatedFields = UpdateSprintSchema.safeParse(values)
    if (!validatedFields.success) {
      return { error: 'Invalid fields', data: null }
    }

    const sprint = await db.sprint.update({
      where: { id: sprintId },
      data: {
        ...(validatedFields.data.name && { name: validatedFields.data.name }),
        ...(validatedFields.data.goal !== undefined && {
          goal: validatedFields.data.goal,
        }),
        ...(validatedFields.data.startDate !== undefined && {
          startDate: validatedFields.data.startDate,
        }),
        ...(validatedFields.data.endDate !== undefined && {
          endDate: validatedFields.data.endDate,
        }),
      },
    })

    revalidatePath(`/projects/${existingSprint.projectId}`)
    revalidatePath(`/projects/${existingSprint.projectId}/backlog`)
    revalidatePath(`/projects/${existingSprint.projectId}/sprints/${sprintId}`)

    return { data: sprint, error: null, message: 'Sprint updated successfully' }
  } catch (error) {
    console.error('[UPDATE_SPRINT]', error)
    return { error: 'Failed to update sprint', data: null }
  }
}

/**
 * Start a sprint
 */
export const startSprint = async (sprintId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const existingSprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: { project: true },
    })

    if (!existingSprint) {
      return { error: 'Sprint not found', data: null }
    }

    const hasAccess = await checkProjectAccess(existingSprint.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    if (existingSprint.status !== 'PLANNED') {
      return { error: 'Only planned sprints can be started', data: null }
    }

    // Check if there's already an active sprint
    const activeSprint = await db.sprint.findFirst({
      where: {
        projectId: existingSprint.projectId,
        status: 'ACTIVE',
      },
    })

    if (activeSprint) {
      return {
        error: `Sprint "${activeSprint.name}" is already active. Complete it before starting a new one.`,
        data: null,
      }
    }

    const sprint = await db.sprint.update({
      where: { id: sprintId },
      data: {
        status: 'ACTIVE',
        startDate: existingSprint.startDate || new Date(),
      },
    })

    revalidatePath(`/projects/${existingSprint.projectId}`)
    revalidatePath(`/projects/${existingSprint.projectId}/backlog`)
    revalidatePath(`/projects/${existingSprint.projectId}/sprints/${sprintId}`)
    revalidatePath(`/projects/${existingSprint.projectId}/board`)

    return {
      data: sprint,
      error: null,
      message: `Sprint "${sprint.name}" started`,
    }
  } catch (error) {
    console.error('[START_SPRINT]', error)
    return { error: 'Failed to start sprint', data: null }
  }
}

/**
 * Complete a sprint
 * Moves incomplete issues back to backlog
 */
export const completeSprint = async (sprintId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const existingSprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: true,
        issues: {
          where: { isArchived: false },
        },
      },
    })

    if (!existingSprint) {
      return { error: 'Sprint not found', data: null }
    }

    const hasAccess = await checkProjectAccess(existingSprint.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    if (existingSprint.status !== 'ACTIVE') {
      return { error: 'Only active sprints can be completed', data: null }
    }

    // Count incomplete issues
    const incompleteIssues = existingSprint.issues.filter(
      (issue) => issue.status !== 'DONE'
    )

    // Move incomplete issues back to backlog (set sprintId to null)
    if (incompleteIssues.length > 0) {
      await db.issue.updateMany({
        where: {
          sprintId,
          status: { not: 'DONE' },
          isArchived: false,
        },
        data: { sprintId: null },
      })
    }

    // Mark sprint as completed
    const sprint = await db.sprint.update({
      where: { id: sprintId },
      data: {
        status: 'COMPLETED',
        endDate: existingSprint.endDate || new Date(),
      },
    })

    revalidatePath(`/projects/${existingSprint.projectId}`)
    revalidatePath(`/projects/${existingSprint.projectId}/backlog`)
    revalidatePath(`/projects/${existingSprint.projectId}/sprints/${sprintId}`)
    revalidatePath(`/projects/${existingSprint.projectId}/board`)

    return {
      data: sprint,
      error: null,
      message: `Sprint completed. ${incompleteIssues.length} issue(s) moved to backlog.`,
    }
  } catch (error) {
    console.error('[COMPLETE_SPRINT]', error)
    return { error: 'Failed to complete sprint', data: null }
  }
}

/**
 * Delete a sprint (only planned sprints can be deleted)
 */
export const deleteSprint = async (sprintId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const existingSprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: { project: true },
    })

    if (!existingSprint) {
      return { error: 'Sprint not found', data: null }
    }

    const hasAccess = await checkProjectAccess(existingSprint.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    if (existingSprint.status === 'ACTIVE') {
      return { error: 'Cannot delete an active sprint. Complete it first.', data: null }
    }

    // Move all issues back to backlog before deleting
    await db.issue.updateMany({
      where: { sprintId },
      data: { sprintId: null },
    })

    await db.sprint.delete({
      where: { id: sprintId },
    })

    revalidatePath(`/projects/${existingSprint.projectId}`)
    revalidatePath(`/projects/${existingSprint.projectId}/backlog`)

    return {
      data: null,
      error: null,
      message: 'Sprint deleted successfully',
    }
  } catch (error) {
    console.error('[DELETE_SPRINT]', error)
    return { error: 'Failed to delete sprint', data: null }
  }
}

/**
 * Move an issue to a sprint
 */
export const moveIssueToSprint = async (issueId: string, sprintId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    })

    if (!issue) {
      return { error: 'Issue not found', data: null }
    }

    const hasAccess = await checkProjectAccess(issue.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    // Verify sprint exists and belongs to the same project
    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
    })

    if (!sprint) {
      return { error: 'Sprint not found', data: null }
    }

    if (sprint.projectId !== issue.projectId) {
      return { error: 'Sprint and issue must belong to the same project', data: null }
    }

    if (sprint.status === 'COMPLETED') {
      return { error: 'Cannot add issues to a completed sprint', data: null }
    }

    const updatedIssue = await db.issue.update({
      where: { id: issueId },
      data: { sprintId },
    })

    revalidatePath(`/projects/${issue.projectId}`)
    revalidatePath(`/projects/${issue.projectId}/backlog`)
    revalidatePath(`/projects/${issue.projectId}/sprints/${sprintId}`)
    revalidatePath(`/projects/${issue.projectId}/board`)

    return {
      data: updatedIssue,
      error: null,
      message: `Issue moved to "${sprint.name}"`,
    }
  } catch (error) {
    console.error('[MOVE_ISSUE_TO_SPRINT]', error)
    return { error: 'Failed to move issue', data: null }
  }
}

/**
 * Remove an issue from sprint (move to backlog)
 */
export const removeIssueFromSprint = async (issueId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: { project: true, sprint: true },
    })

    if (!issue) {
      return { error: 'Issue not found', data: null }
    }

    const hasAccess = await checkProjectAccess(issue.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    if (!issue.sprintId) {
      return { error: 'Issue is already in backlog', data: null }
    }

    const sprintId = issue.sprintId

    const updatedIssue = await db.issue.update({
      where: { id: issueId },
      data: { sprintId: null },
    })

    revalidatePath(`/projects/${issue.projectId}`)
    revalidatePath(`/projects/${issue.projectId}/backlog`)
    revalidatePath(`/projects/${issue.projectId}/sprints/${sprintId}`)
    revalidatePath(`/projects/${issue.projectId}/board`)

    return {
      data: updatedIssue,
      error: null,
      message: 'Issue moved to backlog',
    }
  } catch (error) {
    console.error('[REMOVE_ISSUE_FROM_SPRINT]', error)
    return { error: 'Failed to move issue to backlog', data: null }
  }
}
