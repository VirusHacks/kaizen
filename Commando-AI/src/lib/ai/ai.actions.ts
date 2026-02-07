'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { geminiClient } from './gemini.client'
import {
  AITaskGenerationResponseSchema,
  AIAssigneeSuggestionSchema,
  AISprintPlanSchema,
  AITimelineResponseSchema,
  AIProjectSummarySchema,
  AIError,
  AITaskGenerationResponse,
  AIAssigneeSuggestion,
  AISprintPlan,
  AITimelineResponse,
  AIProjectSummary,
} from './ai.types'
import {
  buildTaskGenerationPrompt,
  buildAssigneeSuggestionPrompt,
  buildSprintPlanningPrompt,
  buildTimelineSuggestionPrompt,
  buildProjectSummaryPrompt,
} from './prompt.builder'

// ============================================
// Helper: Check Project Access
// ============================================

async function checkProjectAccess(projectId: string, userId: string) {
  const project = await db.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  })
  return project
}

// ============================================
// 1. Generate Tasks with AI
// ============================================

export async function generateTasksWithAI(
  projectId: string,
  options?: {
    projectGoal?: string
    additionalContext?: string
  }
): Promise<{
  data: AITaskGenerationResponse | null
  error: string | null
}> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { data: null, error: 'User not authenticated' }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { data: null, error: 'Project not found or access denied' }
    }

    // Fetch existing issues
    const existingIssues = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
      },
      select: {
        title: true,
        type: true,
        status: true,
        priority: true,
      },
      take: 50, // Limit to avoid context overflow
      orderBy: { createdAt: 'desc' },
    })

    // Fetch team members with workload
    const members = await db.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            clerkId: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Get open tasks count per member
    const memberWorkload = await Promise.all(
      members.map(async (m) => {
        const openTasks = await db.issue.count({
          where: {
            projectId,
            assigneeId: m.userId,
            status: { not: 'DONE' },
            isArchived: false,
          },
        })
        return {
          id: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          openTasksCount: openTasks,
        }
      })
    )

    // Include project owner
    const owner = await db.user.findUnique({
      where: { clerkId: project.ownerId },
      select: { clerkId: true, name: true, email: true },
    })

    if (owner) {
      const ownerOpenTasks = await db.issue.count({
        where: {
          projectId,
          assigneeId: owner.clerkId,
          status: { not: 'DONE' },
          isArchived: false,
        },
      })
      memberWorkload.unshift({
        id: owner.clerkId,
        name: owner.name,
        email: owner.email,
        role: 'OWNER' as const,
        openTasksCount: ownerOpenTasks,
      })
    }

    // Build prompt
    const { system, user } = buildTaskGenerationPrompt({
      project: {
        name: project.name,
        description: project.description,
        key: project.key,
      },
      existingIssues,
      teamMembers: memberWorkload,
      projectGoal: options?.projectGoal,
      additionalContext: options?.additionalContext,
    })

    // Call Gemini
    const result = await geminiClient.generateJSON(
      system,
      user,
      (data) => AITaskGenerationResponseSchema.parse(data)
    )

    console.log('[AI_GENERATE_TASKS]', {
      projectId,
      userId,
      tasksGenerated: result.data.tasks.length,
      durationMs: result.durationMs,
    })

    return { data: result.data, error: null }
  } catch (error) {
    console.error('[AI_GENERATE_TASKS_ERROR]', error)
    
    if (error instanceof AIError) {
      return { data: null, error: error.message }
    }
    
    return { data: null, error: 'Failed to generate tasks with AI' }
  }
}

// ============================================
// 2. Suggest Task Assignee
// ============================================

export async function suggestTaskAssignee(
  issueId: string
): Promise<{
  data: AIAssigneeSuggestion | null
  error: string | null
}> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { data: null, error: 'User not authenticated' }
    }

    // Fetch issue with project
    const issue = await db.issue.findUnique({
      where: { id: issueId },
      include: {
        project: true,
      },
    })

    if (!issue) {
      return { data: null, error: 'Issue not found' }
    }

    const project = await checkProjectAccess(issue.projectId, userId)
    if (!project) {
      return { data: null, error: 'Access denied' }
    }

    // Fetch team members with workload and recent assignments
    const members = await db.projectMember.findMany({
      where: { projectId: issue.projectId },
      include: {
        user: {
          select: {
            clerkId: true,
            name: true,
            email: true,
          },
        },
      },
    })

    const memberData = await Promise.all(
      members.map(async (m) => {
        const openTasks = await db.issue.count({
          where: {
            projectId: issue.projectId,
            assigneeId: m.userId,
            status: { not: 'DONE' },
            isArchived: false,
          },
        })

        const recentAssignments = await db.issue.findMany({
          where: {
            projectId: issue.projectId,
            assigneeId: m.userId,
            isArchived: false,
          },
          select: { title: true },
          take: 5,
          orderBy: { updatedAt: 'desc' },
        })

        return {
          id: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          openTasksCount: openTasks,
          recentAssignments: recentAssignments.map((r) => r.title),
        }
      })
    )

    // Include owner
    const owner = await db.user.findUnique({
      where: { clerkId: project.ownerId },
      select: { clerkId: true, name: true, email: true },
    })

    if (owner) {
      const ownerOpenTasks = await db.issue.count({
        where: {
          projectId: issue.projectId,
          assigneeId: owner.clerkId,
          status: { not: 'DONE' },
          isArchived: false,
        },
      })

      const ownerRecentAssignments = await db.issue.findMany({
        where: {
          projectId: issue.projectId,
          assigneeId: owner.clerkId,
          isArchived: false,
        },
        select: { title: true },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      })

      memberData.unshift({
        id: owner.clerkId,
        name: owner.name,
        email: owner.email,
        role: 'OWNER' as const,
        openTasksCount: ownerOpenTasks,
        recentAssignments: ownerRecentAssignments.map((r) => r.title),
      })
    }

    if (memberData.length === 0) {
      return { data: null, error: 'No team members available' }
    }

    // Build prompt
    const { system, user } = buildAssigneeSuggestionPrompt({
      issue: {
        title: issue.title,
        description: issue.description,
        type: issue.type,
        priority: issue.priority,
        status: issue.status,
      },
      teamMembers: memberData,
      projectContext: `Project: ${project.name}`,
    })

    // Call Gemini
    const result = await geminiClient.generateJSON(
      system,
      user,
      (data) => AIAssigneeSuggestionSchema.parse(data)
    )

    console.log('[AI_SUGGEST_ASSIGNEE]', {
      issueId,
      userId,
      suggestedAssignee: result.data.suggestedAssigneeName,
      confidence: result.data.confidence,
      durationMs: result.durationMs,
    })

    return { data: result.data, error: null }
  } catch (error) {
    console.error('[AI_SUGGEST_ASSIGNEE_ERROR]', error)
    
    if (error instanceof AIError) {
      return { data: null, error: error.message }
    }
    
    return { data: null, error: 'Failed to suggest assignee' }
  }
}

// ============================================
// 3. Plan Sprint with AI
// ============================================

export async function planSprintWithAI(
  projectId: string
): Promise<{
  data: AISprintPlan | null
  error: string | null
}> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { data: null, error: 'User not authenticated' }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { data: null, error: 'Project not found or access denied' }
    }

    // Fetch backlog issues (not in any sprint)
    const backlogIssues = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
        sprintId: null,
      },
      select: {
        id: true,
        title: true,
        type: true,
        priority: true,
        status: true,
        assignee: {
          select: {
            clerkId: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 30,
    })

    if (backlogIssues.length === 0) {
      return { data: null, error: 'No backlog issues to plan' }
    }

    // Fetch team members with workload
    const members = await db.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            clerkId: true,
            name: true,
          },
        },
      },
    })

    const memberData = await Promise.all(
      members.map(async (m) => {
        const openTasks = await db.issue.count({
          where: {
            projectId,
            assigneeId: m.userId,
            status: { not: 'DONE' },
            isArchived: false,
          },
        })
        return {
          id: m.userId,
          name: m.user.name,
          openTasksCount: openTasks,
          role: m.role,
        }
      })
    )

    // Fetch previous sprints for context
    const previousSprints = await db.sprint.findMany({
      where: { projectId },
      select: {
        name: true,
        goal: true,
        issues: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    })

    const sprintHistory = previousSprints.map((s) => ({
      name: s.name,
      goal: s.goal,
      totalIssues: s.issues.length,
      completedIssues: s.issues.filter((i) => i.status === 'DONE').length,
    }))

    // Build prompt
    const { system, user } = buildSprintPlanningPrompt({
      project: {
        name: project.name,
        description: project.description,
      },
      backlogIssues: backlogIssues.map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        priority: i.priority,
        status: i.status,
        assignee: i.assignee ? { id: i.assignee.clerkId, name: i.assignee.name } : null,
      })),
      teamMembers: memberData,
      previousSprints: sprintHistory,
    })

    // Call Gemini
    const result = await geminiClient.generateJSON(
      system,
      user,
      (data) => AISprintPlanSchema.parse(data)
    )

    console.log('[AI_PLAN_SPRINT]', {
      projectId,
      userId,
      recommendedTasks: result.data.recommendedTasks.length,
      deferredTasks: result.data.deferredTasks.length,
      warnings: result.data.warnings?.length ?? 0,
      durationMs: result.durationMs,
    })

    return { data: result.data, error: null }
  } catch (error) {
    console.error('[AI_PLAN_SPRINT_ERROR]', error)
    
    if (error instanceof AIError) {
      return { data: null, error: error.message }
    }
    
    return { data: null, error: 'Failed to plan sprint with AI' }
  }
}

// ============================================
// 4. Suggest Timeline with AI
// ============================================

export async function suggestTimelineWithAI(
  projectId: string
): Promise<{
  data: AITimelineResponse | null
  error: string | null
}> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { data: null, error: 'User not authenticated' }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { data: null, error: 'Project not found or access denied' }
    }

    // Fetch issues without dates or needing review
    const issues = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
        status: { not: 'DONE' },
      },
      select: {
        id: true,
        title: true,
        type: true,
        priority: true,
        status: true,
        startDate: true,
        dueDate: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: 20,
    })

    if (issues.length === 0) {
      return { data: null, error: 'No issues to suggest timeline for' }
    }

    // Fetch active sprint
    const activeSprint = await db.sprint.findFirst({
      where: {
        projectId,
        status: 'ACTIVE',
      },
      select: {
        name: true,
        startDate: true,
        endDate: true,
      },
    })

    // Build prompt
    const { system, user } = buildTimelineSuggestionPrompt({
      project: {
        name: project.name,
        description: project.description,
      },
      issues: issues.map((i) => ({
        id: i.id,
        title: i.title,
        type: i.type,
        priority: i.priority,
        status: i.status,
        currentStartDate: i.startDate?.toISOString().split('T')[0] || null,
        currentDueDate: i.dueDate?.toISOString().split('T')[0] || null,
      })),
      activeSprint: activeSprint
        ? {
            name: activeSprint.name,
            startDate: activeSprint.startDate?.toISOString().split('T')[0] || null,
            endDate: activeSprint.endDate?.toISOString().split('T')[0] || null,
          }
        : undefined,
    })

    // Call Gemini
    const result = await geminiClient.generateJSON(
      system,
      user,
      (data) => AITimelineResponseSchema.parse(data)
    )

    console.log('[AI_SUGGEST_TIMELINE]', {
      projectId,
      userId,
      suggestionsCount: result.data.suggestions.length,
      risksCount: result.data.risks?.length || 0,
      durationMs: result.durationMs,
    })

    return { data: result.data, error: null }
  } catch (error) {
    console.error('[AI_SUGGEST_TIMELINE_ERROR]', error)
    
    if (error instanceof AIError) {
      return { data: null, error: error.message }
    }
    
    return { data: null, error: 'Failed to suggest timeline' }
  }
}

// ============================================
// 5. Generate Project Summary
// ============================================

export async function generateProjectSummary(
  projectId: string
): Promise<{
  data: AIProjectSummary | null
  error: string | null
}> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { data: null, error: 'User not authenticated' }
    }

    const project = await checkProjectAccess(projectId, userId)
    if (!project) {
      return { data: null, error: 'Project not found or access denied' }
    }

    // Fetch issue statistics
    const issues = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
      },
      select: {
        status: true,
        priority: true,
        dueDate: true,
      },
    })

    const stats = {
      totalIssues: issues.length,
      byStatus: {
        TODO: issues.filter((i) => i.status === 'TODO').length,
        IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS').length,
        IN_REVIEW: issues.filter((i) => i.status === 'IN_REVIEW').length,
        DONE: issues.filter((i) => i.status === 'DONE').length,
      },
      byPriority: {
        CRITICAL: issues.filter((i) => i.priority === 'CRITICAL').length,
        HIGH: issues.filter((i) => i.priority === 'HIGH').length,
        MEDIUM: issues.filter((i) => i.priority === 'MEDIUM').length,
        LOW: issues.filter((i) => i.priority === 'LOW').length,
      },
      overdueCount: issues.filter(
        (i) => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== 'DONE'
      ).length,
    }

    // Fetch active sprint
    const activeSprint = await db.sprint.findFirst({
      where: {
        projectId,
        status: 'ACTIVE',
      },
      include: {
        issues: {
          select: { status: true },
        },
      },
    })

    const sprintInfo = activeSprint
      ? {
          name: activeSprint.name,
          goal: activeSprint.goal,
          progress: activeSprint.issues.length > 0
            ? Math.round(
                (activeSprint.issues.filter((i) => i.status === 'DONE').length /
                  activeSprint.issues.length) *
                  100
              )
            : 0,
          daysRemaining: activeSprint.endDate
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(activeSprint.endDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0,
        }
      : undefined

    // Fetch recent activity
    const recentActivity = await db.issue.findMany({
      where: {
        projectId,
        isArchived: false,
      },
      select: {
        title: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    })

    // Fetch team size
    const teamSize = await db.projectMember.count({
      where: { projectId },
    })

    // Build prompt
    const { system, user } = buildProjectSummaryPrompt({
      project: {
        name: project.name,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
      },
      stats,
      activeSprint: sprintInfo,
      recentActivity: recentActivity.map((a) => ({
        title: a.title,
        status: a.status,
        updatedAt: a.updatedAt.toISOString(),
      })),
      teamSize: teamSize + 1, // +1 for owner
    })

    // Call Gemini
    const result = await geminiClient.generateJSON(
      system,
      user,
      (data) => AIProjectSummarySchema.parse(data)
    )

    console.log('[AI_PROJECT_SUMMARY]', {
      projectId,
      userId,
      risksCount: result.data.risks?.length ?? 0,
      recommendationsCount: result.data.recommendations?.length ?? 0,
      durationMs: result.durationMs,
    })

    return { data: result.data, error: null }
  } catch (error) {
    console.error('[AI_PROJECT_SUMMARY_ERROR]', error)
    
    if (error instanceof AIError) {
      return { data: null, error: error.message }
    }
    
    return { data: null, error: 'Failed to generate project summary' }
  }
}
