'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'

/**
 * Get the current user's Clerk ID
 */
const getCurrentUserId = async () => {
  const { userId } = await auth()
  return userId
}

/**
 * Get all issues assigned to the current user in a project
 */
export const getMyAssignedIssues = async (projectId: string) => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    const issues = await db.issue.findMany({
      where: {
        projectId,
        assigneeId: userId,
        isArchived: false,
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
        parent: {
          select: {
            id: true,
            title: true,
            number: true,
            type: true,
          },
        },
        sprint: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: { children: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return { data: issues, error: null }
  } catch (error) {
    console.error('[GET_MY_ASSIGNED_ISSUES]', error)
    return { error: 'Failed to fetch assigned issues', data: null }
  }
}

/**
 * Get a single issue with full details for the developer view
 */
export const getIssueDetails = async (issueId: string) => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    const issue = await db.issue.findUnique({
      where: { id: issueId },
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
        parent: {
          select: {
            id: true,
            title: true,
            number: true,
            type: true,
          },
        },
        children: {
          where: { isArchived: false },
          select: {
            id: true,
            title: true,
            number: true,
            type: true,
            status: true,
            priority: true,
          },
          orderBy: { number: 'asc' },
        },
        sprint: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            key: true,
            name: true,
            setup: {
              select: {
                techStack: true,
                vision: true,
              },
            },
          },
        },
      },
    })

    if (!issue) {
      return { error: 'Issue not found', data: null }
    }

    return { data: issue, error: null }
  } catch (error) {
    console.error('[GET_ISSUE_DETAILS]', error)
    return { error: 'Failed to fetch issue details', data: null }
  }
}

/**
 * Get developer stats for the project
 */
export const getDevStats = async (projectId: string) => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    const [total, todo, inProgress, inReview, done, critical, high] = await Promise.all([
      db.issue.count({ where: { projectId, assigneeId: userId, isArchived: false } }),
      db.issue.count({ where: { projectId, assigneeId: userId, isArchived: false, status: 'TODO' } }),
      db.issue.count({ where: { projectId, assigneeId: userId, isArchived: false, status: 'IN_PROGRESS' } }),
      db.issue.count({ where: { projectId, assigneeId: userId, isArchived: false, status: 'IN_REVIEW' } }),
      db.issue.count({ where: { projectId, assigneeId: userId, isArchived: false, status: 'DONE' } }),
      db.issue.count({ where: { projectId, assigneeId: userId, isArchived: false, priority: 'CRITICAL' } }),
      db.issue.count({ where: { projectId, assigneeId: userId, isArchived: false, priority: 'HIGH' } }),
    ])

    // Get active sprint info
    const activeSprint = await db.sprint.findFirst({
      where: { projectId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        endDate: true,
        _count: {
          select: {
            issues: {
              where: { assigneeId: userId, isArchived: false },
            },
          },
        },
      },
    })

    return {
      data: {
        total,
        todo,
        inProgress,
        inReview,
        done,
        critical,
        high,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
        activeSprint: activeSprint
          ? {
              id: activeSprint.id,
              name: activeSprint.name,
              endDate: activeSprint.endDate?.toISOString() || null,
              myIssueCount: activeSprint._count.issues,
            }
          : null,
      },
      error: null,
    }
  } catch (error) {
    console.error('[GET_DEV_STATS]', error)
    return { error: 'Failed to fetch stats', data: null }
  }
}
