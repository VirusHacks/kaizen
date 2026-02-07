'use server'

import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  IssueFormSchema,
  UpdateIssueSchema,
  IssueStatusEnum,
} from '@/lib/types'
import { validateTransition } from '../../settings/workflow/_actions/workflow-actions'

/**
 * Get the current user ID using auth() - lighter than currentUser()
 */
const getCurrentUserId = async () => {
  const { userId } = await auth()
  return userId
}

/**
 * Ensures the current Clerk user exists in our database.
 * Only use this for write operations that need the full user object.
 */
const ensureUserInDb = async () => {
  const user = await currentUser()
  if (!user) return null

  const existingUser = await db.user.findUnique({
    where: { clerkId: user.id },
  })

  if (existingUser) return user

  const email = user.emailAddresses?.[0]?.emailAddress || ''
  await db.user.upsert({
    where: { clerkId: user.id },
    update: {
      email: email,
      name: user.firstName || user.username || '',
      profileImage: user.imageUrl || '',
    },
    create: {
      clerkId: user.id,
      email: email,
      name: user.firstName || user.username || '',
      profileImage: user.imageUrl || '',
    },
  })

  return user
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
 * Get all issues for a project
 */
export const getProjectIssues = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null, project: null }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { error: 'Project not found or access denied', data: null, project: null }
    }

    const issues = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
        parentId: null, // Only get top-level issues, not subtasks
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
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return { data: issues, error: null, project }
  } catch (error) {
    console.error('[GET_PROJECT_ISSUES]', error)
    return { error: 'Failed to fetch issues', data: null, project: null }
  }
}

/**
 * Get a single issue by ID
 */
export const getIssueById = async (issueId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: {
        project: true,
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
        parent: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
        children: {
          where: { isArchived: false },
          include: {
            assignee: {
              select: {
                clerkId: true,
                name: true,
                profileImage: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!issue) {
      return { error: 'Issue not found', data: null }
    }

    // Check project access
    const hasAccess = await checkProjectAccess(issue.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    return { data: issue, error: null }
  } catch (error) {
    console.error('[GET_ISSUE_BY_ID]', error)
    return { error: 'Failed to fetch issue', data: null }
  }
}

/**
 * Create a new issue
 */
export const createIssue = async (
  projectId: string,
  values: z.infer<typeof IssueFormSchema>
) => {
  try {
    const user = await ensureUserInDb()
    if (!user) {
      return { error: 'User not authenticated', data: null }
    }

    const validatedFields = IssueFormSchema.safeParse(values)
    if (!validatedFields.success) {
      return { error: 'Invalid fields', data: null }
    }

    const project = await checkProjectAccess(projectId, user.id)
    if (!project) {
      return { error: 'Project not found or access denied', data: null }
    }

    // Increment project counter first (without transaction to avoid Neon timeout)
    const updatedProject = await db.project.update({
      where: { id: projectId },
      data: { issueCounter: { increment: 1 } },
    })

    // Create the issue with the new counter value
    const issue = await db.issue.create({
      data: {
        number: updatedProject.issueCounter,
        title: validatedFields.data.title,
        description: validatedFields.data.description || null,
        type: validatedFields.data.type,
        status: validatedFields.data.status,
        priority: validatedFields.data.priority,
        assigneeId: validatedFields.data.assigneeId || null,
        startDate: validatedFields.data.startDate || null,
        dueDate: validatedFields.data.dueDate || null,
        parentId: validatedFields.data.parentId || null,
        projectId,
        reporterId: user.id,
      },
      include: {
        project: { select: { key: true } },
      },
    })

    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/issues`)

    return {
      data: issue,
      error: null,
      message: `Issue ${issue.project.key}-${issue.number} created successfully`,
    }
  } catch (error) {
    console.error('[CREATE_ISSUE]', error)
    return { error: 'Failed to create issue', data: null }
  }
}

/**
 * Update an existing issue
 */
export const updateIssue = async (
  issueId: string,
  values: z.infer<typeof UpdateIssueSchema>
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const validatedFields = UpdateIssueSchema.safeParse(values)
    if (!validatedFields.success) {
      return { error: 'Invalid fields', data: null }
    }

    const existingIssue = await db.issue.findUnique({
      where: { id: issueId },
      include: { project: true },
    })

    if (!existingIssue) {
      return { error: 'Issue not found', data: null }
    }

    // Check project access
    const hasAccess = await checkProjectAccess(existingIssue.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    const issue = await db.issue.update({
      where: { id: issueId },
      data: {
        ...(validatedFields.data.title && { title: validatedFields.data.title }),
        ...(validatedFields.data.description !== undefined && {
          description: validatedFields.data.description,
        }),
        ...(validatedFields.data.type && { type: validatedFields.data.type }),
        ...(validatedFields.data.status && { status: validatedFields.data.status }),
        ...(validatedFields.data.priority && { priority: validatedFields.data.priority }),
        ...(validatedFields.data.assigneeId !== undefined && {
          assigneeId: validatedFields.data.assigneeId,
        }),
        ...(validatedFields.data.startDate !== undefined && {
          startDate: validatedFields.data.startDate,
        }),
        ...(validatedFields.data.dueDate !== undefined && {
          dueDate: validatedFields.data.dueDate,
        }),
      },
    })

    revalidatePath(`/projects/${existingIssue.projectId}`)
    revalidatePath(`/projects/${existingIssue.projectId}/issues`)
    revalidatePath(`/projects/${existingIssue.projectId}/issues/${issueId}`)

    return { data: issue, error: null, message: 'Issue updated successfully' }
  } catch (error) {
    console.error('[UPDATE_ISSUE]', error)
    return { error: 'Failed to update issue', data: null }
  }
}

/**
 * Change issue status with workflow validation
 */
export const changeIssueStatus = async (
  issueId: string,
  status: z.infer<typeof IssueStatusEnum>
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const existingIssue = await db.issue.findUnique({
      where: { id: issueId },
    })

    if (!existingIssue) {
      return { error: 'Issue not found', data: null }
    }

    // Check project access
    const hasAccess = await checkProjectAccess(existingIssue.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    // Validate transition using workflow engine
    const validation = await validateTransition(
      existingIssue.projectId,
      issueId,
      existingIssue.status,
      status
    )

    if (!validation.valid) {
      return { error: validation.error || 'Invalid transition', data: null }
    }

    const issue = await db.issue.update({
      where: { id: issueId },
      data: { status },
    })

    revalidatePath(`/projects/${existingIssue.projectId}`)
    revalidatePath(`/projects/${existingIssue.projectId}/issues`)
    revalidatePath(`/projects/${existingIssue.projectId}/board`)

    return { data: issue, error: null, message: 'Status updated' }
  } catch (error) {
    console.error('[CHANGE_ISSUE_STATUS]', error)
    return { error: 'Failed to update status', data: null }
  }
}

/**
 * Assign issue to a user
 */
export const assignIssue = async (issueId: string, assigneeId: string | null) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const existingIssue = await db.issue.findUnique({
      where: { id: issueId },
    })

    if (!existingIssue) {
      return { error: 'Issue not found', data: null }
    }

    // Check project access
    const hasAccess = await checkProjectAccess(existingIssue.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    const issue = await db.issue.update({
      where: { id: issueId },
      data: { assigneeId },
      include: {
        assignee: {
          select: { name: true, email: true },
        },
      },
    })

    revalidatePath(`/projects/${existingIssue.projectId}/issues`)

    return {
      data: issue,
      error: null,
      message: assigneeId
        ? `Assigned to ${issue.assignee?.name || issue.assignee?.email}`
        : 'Unassigned',
    }
  } catch (error) {
    console.error('[ASSIGN_ISSUE]', error)
    return { error: 'Failed to assign issue', data: null }
  }
}

/**
 * Archive an issue (soft delete)
 */
export const archiveIssue = async (issueId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    const existingIssue = await db.issue.findUnique({
      where: { id: issueId },
    })

    if (!existingIssue) {
      return { error: 'Issue not found', data: null }
    }

    // Check project access
    const hasAccess = await checkProjectAccess(existingIssue.projectId, userId)
    if (!hasAccess) {
      return { error: 'Access denied', data: null }
    }

    // Archive issue and all its subtasks
    await db.issue.updateMany({
      where: {
        OR: [{ id: issueId }, { parentId: issueId }],
      },
      data: { isArchived: true },
    })

    revalidatePath(`/projects/${existingIssue.projectId}`)
    revalidatePath(`/projects/${existingIssue.projectId}/issues`)

    return { data: null, error: null, message: 'Issue archived successfully' }
  } catch (error) {
    console.error('[ARCHIVE_ISSUE]', error)
    return { error: 'Failed to archive issue', data: null }
  }
}

/**
 * Get project members for assignment dropdown
 * For now, returns only the project owner. 
 * TODO: Implement project members when team feature is added
 */
export const getProjectMembers = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            clerkId: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    })

    if (!project) {
      return { error: 'Project not found', data: null }
    }

    // For now, only the owner is a member
    return { data: [project.owner], error: null }
  } catch (error) {
    console.error('[GET_PROJECT_MEMBERS]', error)
    return { error: 'Failed to fetch members', data: null }
  }
}
