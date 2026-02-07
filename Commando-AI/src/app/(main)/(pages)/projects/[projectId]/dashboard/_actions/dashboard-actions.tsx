'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { IssueStatus, IssuePriority, SprintStatus } from '@prisma/client'

/**
 * Get aggregated dashboard data for a project
 * This combines multiple queries efficiently for the dashboard view
 */
export const getProjectDashboardData = async (projectId: string) => {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check if user has access to the project (owner or member)
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
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
      return { error: 'Project not found or access denied', data: null }
    }

    // Fetch all data in parallel for performance
    const [
      members,
      issues,
      activeSprint,
      backlogIssues,
      recentActivity,
      sprints,
    ] = await Promise.all([
      // Team members
      db.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              clerkId: true,
              name: true,
              email: true,
              profileImage: true,
            },
          },
        },
        take: 10,
      }),

      // All issues for stats
      db.issue.findMany({
        where: {
          projectId,
          isArchived: false,
        },
        select: {
          id: true,
          status: true,
          priority: true,
          dueDate: true,
          sprintId: true,
        },
      }),

      // Active sprint with issues
      db.sprint.findFirst({
        where: {
          projectId,
          status: 'ACTIVE',
        },
        include: {
          issues: {
            where: { isArchived: false },
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),

      // Backlog issues (not in any sprint)
      db.issue.findMany({
        where: {
          projectId,
          isArchived: false,
          sprintId: null,
        },
        select: {
          id: true,
          number: true,
          title: true,
          type: true,
          status: true,
          priority: true,
          assignee: {
            select: {
              clerkId: true,
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 5,
      }),

      // Recent activity (issue updates)
      db.issue.findMany({
        where: {
          projectId,
          isArchived: false,
        },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          updatedAt: true,
          assignee: {
            select: {
              clerkId: true,
              name: true,
              profileImage: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 8,
      }),

      // All sprints for context
      db.sprint.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    // Calculate issue statistics
    const issueStats = {
      total: issues.length,
      byStatus: {
        TODO: issues.filter((i) => i.status === 'TODO').length,
        IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS').length,
        IN_REVIEW: issues.filter((i) => i.status === 'IN_REVIEW').length,
        DONE: issues.filter((i) => i.status === 'DONE').length,
      } as Record<IssueStatus, number>,
      byPriority: {
        CRITICAL: issues.filter((i) => i.priority === 'CRITICAL').length,
        HIGH: issues.filter((i) => i.priority === 'HIGH').length,
        MEDIUM: issues.filter((i) => i.priority === 'MEDIUM').length,
        LOW: issues.filter((i) => i.priority === 'LOW').length,
      } as Record<IssuePriority, number>,
      overdue: issues.filter(
        (i) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'DONE'
      ).length,
    }

    // Sprint progress
    const sprintProgress = activeSprint
      ? {
          id: activeSprint.id,
          name: activeSprint.name,
          goal: activeSprint.goal,
          startDate: activeSprint.startDate?.toISOString() || null,
          endDate: activeSprint.endDate?.toISOString() || null,
          totalIssues: activeSprint.issues.length,
          completedIssues: activeSprint.issues.filter((i) => i.status === 'DONE').length,
          inProgressIssues: activeSprint.issues.filter(
            (i) => i.status === 'IN_PROGRESS' || i.status === 'IN_REVIEW'
          ).length,
        }
      : null

    // Board snapshot (issues per status for current sprint or all)
    const boardSnapshot = {
      TODO: issues.filter(
        (i) => i.status === 'TODO' && (activeSprint ? i.sprintId === activeSprint.id : true)
      ).length,
      IN_PROGRESS: issues.filter(
        (i) => i.status === 'IN_PROGRESS' && (activeSprint ? i.sprintId === activeSprint.id : true)
      ).length,
      IN_REVIEW: issues.filter(
        (i) => i.status === 'IN_REVIEW' && (activeSprint ? i.sprintId === activeSprint.id : true)
      ).length,
      DONE: issues.filter(
        (i) => i.status === 'DONE' && (activeSprint ? i.sprintId === activeSprint.id : true)
      ).length,
    }

    // Timeline preview (upcoming issues)
    const upcomingIssues = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
        OR: [
          { dueDate: { gte: new Date() } },
          { startDate: { gte: new Date() } },
        ],
      },
      select: {
        id: true,
        number: true,
        title: true,
        type: true,
        status: true,
        startDate: true,
        dueDate: true,
      },
      orderBy: [{ dueDate: 'asc' }, { startDate: 'asc' }],
      take: 6,
    })

    // Format team members including owner
    const teamMembers = [
      {
        id: 'owner',
        userId: project.owner.clerkId,
        role: 'OWNER' as const,
        user: project.owner,
      },
      ...members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
    ]

    return {
      data: {
        project: {
          id: project.id,
          name: project.name,
          key: project.key,
          description: project.description,
          isArchived: project.isArchived,
          createdAt: project.createdAt.toISOString(),
          owner: project.owner,
        },
        team: {
          totalCount: teamMembers.length,
          members: teamMembers,
        },
        issueStats,
        sprintProgress,
        boardSnapshot,
        backlog: {
          totalCount: issues.filter((i) => !i.sprintId).length,
          preview: backlogIssues.map((i) => ({
            id: i.id,
            number: i.number,
            title: i.title,
            type: i.type,
            status: i.status,
            priority: i.priority,
            assignee: i.assignee,
          })),
        },
        timeline: {
          upcomingIssues: upcomingIssues.map((i) => ({
            id: i.id,
            number: i.number,
            title: i.title,
            type: i.type,
            status: i.status,
            startDate: i.startDate?.toISOString() || null,
            dueDate: i.dueDate?.toISOString() || null,
          })),
        },
        recentActivity: recentActivity.map((i) => ({
          id: i.id,
          number: i.number,
          title: i.title,
          status: i.status,
          updatedAt: i.updatedAt.toISOString(),
          assignee: i.assignee,
        })),
        sprintsCount: sprints.length,
      },
      error: null,
    }
  } catch (error) {
    console.error('[GET_PROJECT_DASHBOARD_DATA]', error)
    return { error: 'Failed to fetch dashboard data', data: null }
  }
}

// Type exports for components
export type DashboardData = NonNullable<
  Awaited<ReturnType<typeof getProjectDashboardData>>['data']
>
