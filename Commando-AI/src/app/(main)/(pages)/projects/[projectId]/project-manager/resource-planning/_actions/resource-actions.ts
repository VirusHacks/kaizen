'use server'

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import {
  calculateDeliveryConfidence,
  identifyDeliveryRisks,
  calculateTeamUtilization,
  generateRecommendations,
} from '@/lib/resource-allocation/engine'
import type {
  CapacityInfo,
  TaskInfo,
  PlanningState,
  ResourcePlanningData,
} from '@/lib/resource-allocation/types'

// ==========================================
// Get or create resource config for a project
// ==========================================
async function getOrCreateConfig(projectId: string) {
  let config = await db.resourceConfig.findUnique({
    where: { projectId },
  })

  if (!config) {
    config = await db.resourceConfig.create({
      data: {
        projectId,
        deliverySlippageWeight: 0.4,
        costOverrunWeight: 0.2,
        overworkWeight: 0.25,
        onTimeBonusWeight: 0.15,
        planningCycleType: 'DAILY',
        maxChangesPerCycle: 5,
        learningEnabled: true,
        burnoutThreshold: 70,
        overworkHoursWeekly: 50,
        idleThresholdPercent: 30,
      },
    })
  }

  return config
}

// ==========================================
// Build the planning state from DB
// ==========================================
async function buildPlanningState(projectId: string): Promise<PlanningState> {
  const [issues, members, allocations, activeSprint] = await Promise.all([
    db.issue.findMany({
      where: { projectId, isArchived: false },
      include: {
        assignee: { select: { clerkId: true, name: true, email: true } },
        parent: { select: { id: true, status: true } },
        children: { select: { id: true } },
      },
    }),
    db.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { clerkId: true, name: true, email: true, profileImage: true } },
      },
    }),
    db.resourceAllocation.findMany({
      where: { projectId },
    }),
    db.sprint.findFirst({
      where: { projectId, status: 'ACTIVE' },
    }),
  ])

  // Build task info
  const tasks: TaskInfo[] = issues.map(issue => ({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    type: issue.type,
    status: issue.status,
    priority: issue.priority,
    assigneeId: issue.assigneeId,
    assigneeName: issue.assignee?.name || issue.assignee?.email || null,
    sprintId: issue.sprintId,
    dueDate: issue.dueDate?.toISOString() || null,
    startDate: issue.startDate?.toISOString() || null,
    estimatedHours: 8, // Default estimate if not tracked
    dependencies: issue.parentId ? [issue.parentId] : [],
    storyPoints: 0,
  }))

  // Build capacity info
  const team: CapacityInfo[] = members.map(member => {
    const allocation = allocations.find(a => a.userId === member.userId)
    const memberTasks = tasks.filter(t => t.assigneeId === member.userId && t.status !== 'DONE')
    const allocatedHours = memberTasks.length * 8 // rough estimate
    const totalCapacity = allocation?.totalCapacityHours || 40
    const available = Math.max(0, totalCapacity - allocatedHours)

    return {
      userId: member.userId,
      userName: member.user.name || member.user.email,
      totalCapacity,
      allocatedHours,
      availableHours: available,
      utilizationPercent: totalCapacity > 0 ? (allocatedHours / totalCapacity) * 100 : 0,
      velocity: allocation?.velocityScore || 1.0,
      skills: allocation?.skillTags || [],
      burnoutRisk: allocation?.burnoutRiskScore || calculateBurnoutFromTasks(memberTasks.length, allocatedHours, totalCapacity),
      overtimeWeeks: allocation?.consecutiveOvertimeWeeks || 0,
      avgWeeklyHours: allocation?.averageWeeklyHours || 40,
      taskCount: memberTasks.length,
      costRate: allocation?.hourlyRate || 0,
    }
  })

  // Calculate sprint info
  const sprintInfo = activeSprint ? {
    id: activeSprint.id,
    name: activeSprint.name,
    endDate: activeSprint.endDate?.toISOString() || null,
    daysRemaining: activeSprint.endDate
      ? Math.ceil((activeSprint.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  } : null

  const state: PlanningState = {
    tasks,
    team,
    risks: [],
    deliveryConfidence: 0,
    activeSprint: sprintInfo,
  }

  // Calculate derived values
  state.risks = identifyDeliveryRisks(state)
  state.deliveryConfidence = calculateDeliveryConfidence(state)

  return state
}

function calculateBurnoutFromTasks(taskCount: number, allocatedHours: number, capacity: number): number {
  let score = 0
  if (allocatedHours > capacity) {
    score += Math.min(40, ((allocatedHours - capacity) / capacity) * 100)
  }
  if (taskCount > 5) score += (taskCount - 5) * 5
  return Math.min(100, score)
}

// ==========================================
// Main: Get Resource Planning Data
// ==========================================
export async function getResourcePlanningData(projectId: string): Promise<{ data: ResourcePlanningData | null; error: string | null }> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Verify access
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

    // Build state + config in parallel
    const [state, config] = await Promise.all([
      buildPlanningState(projectId),
      getOrCreateConfig(projectId),
    ])

    // Generate recommendations
    const generatedRecs = generateRecommendations(state, {
      deliverySlippageWeight: config.deliverySlippageWeight,
      costOverrunWeight: config.costOverrunWeight,
      overworkWeight: config.overworkWeight,
      onTimeBonusWeight: config.onTimeBonusWeight,
      maxChangesPerCycle: config.maxChangesPerCycle,
      burnoutThreshold: config.burnoutThreshold,
      overworkHoursWeekly: config.overworkHoursWeekly,
    })

    // Fetch existing pending recommendations
    const existingRecs = await db.recommendation.findMany({
      where: {
        snapshot: { projectId },
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Fetch delivery confidence history
    const snapshots = await db.planningCycleSnapshot.findMany({
      where: { projectId },
      select: { createdAt: true, deliveryConfidence: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    // Fetch recent outcomes
    const recentOutcomes = await db.recommendationOutcome.findMany({
      where: {
        recommendation: {
          snapshot: { projectId },
        },
      },
      include: {
        recommendation: { select: { type: true, status: true } },
      },
      orderBy: { measuredAt: 'desc' },
      take: 10,
    })

    // Calculate utilization
    const utilization = calculateTeamUtilization(state.team, config.idleThresholdPercent)

    const data: ResourcePlanningData = {
      project: {
        id: project.id,
        name: project.name,
        key: project.key,
      },
      state,
      utilization,
      recommendations: existingRecs.map(r => ({
        id: r.id,
        type: r.type,
        status: r.status,
        title: r.title,
        description: r.description,
        reason: r.reason,
        actionPayload: r.actionPayload as any,
        deliveryProbabilityChange: r.deliveryProbabilityChange,
        costImpactPercent: r.costImpactPercent,
        burnoutRiskChange: r.burnoutRiskChange,
        impactScore: r.impactScore,
        createdAt: r.createdAt.toISOString(),
        decidedBy: r.decidedBy,
        decidedAt: r.decidedAt?.toISOString() || null,
      })),
      config: {
        deliverySlippageWeight: config.deliverySlippageWeight,
        costOverrunWeight: config.costOverrunWeight,
        overworkWeight: config.overworkWeight,
        onTimeBonusWeight: config.onTimeBonusWeight,
        maxChangesPerCycle: config.maxChangesPerCycle,
        learningEnabled: config.learningEnabled,
        burnoutThreshold: config.burnoutThreshold,
        overworkHoursWeekly: config.overworkHoursWeekly,
        idleThresholdPercent: config.idleThresholdPercent,
      },
      recentOutcomes: recentOutcomes.map(o => ({
        id: o.id,
        recommendationType: o.recommendation.type,
        accepted: o.recommendation.status === 'ACCEPTED',
        actualDeliveryChange: o.actualDeliveryChange,
        actualCostChange: o.actualCostChange,
        measuredAt: o.measuredAt.toISOString(),
      })),
      deliveryConfidenceHistory: snapshots.map(s => ({
        date: s.createdAt.toISOString(),
        confidence: s.deliveryConfidence,
      })).reverse(),
    }

    return { data, error: null }
  } catch (error) {
    console.error('[GET_RESOURCE_PLANNING_DATA]', error)
    return { error: 'Failed to fetch resource planning data', data: null }
  }
}

// ==========================================
// Run Planning Cycle — Generate & Store Recommendations
// ==========================================
export async function runPlanningCycle(projectId: string): Promise<{ success: boolean; error?: string; recommendationCount?: number }> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Not authenticated' }

    const project = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    })
    if (!project) return { success: false, error: 'Access denied' }

    const [state, config] = await Promise.all([
      buildPlanningState(projectId),
      getOrCreateConfig(projectId),
    ])

    // Create snapshot
    const tasksByAssignee: Record<string, string[]> = {}
    state.tasks.forEach(t => {
      if (t.assigneeId) {
        if (!tasksByAssignee[t.assigneeId]) tasksByAssignee[t.assigneeId] = []
        tasksByAssignee[t.assigneeId].push(t.id)
      }
    })

    const snapshot = await db.planningCycleSnapshot.create({
      data: {
        projectId,
        taskBacklog: {
          totalTasks: state.tasks.length,
          byStatus: {
            TODO: state.tasks.filter(t => t.status === 'TODO').length,
            IN_PROGRESS: state.tasks.filter(t => t.status === 'IN_PROGRESS').length,
            IN_REVIEW: state.tasks.filter(t => t.status === 'IN_REVIEW').length,
            DONE: state.tasks.filter(t => t.status === 'DONE').length,
          },
        },
        currentAssignments: tasksByAssignee,
        capacityMap: Object.fromEntries(
          state.team.map(m => [m.userId, {
            available: m.availableHours,
            used: m.allocatedHours,
            max: m.totalCapacity,
            velocity: m.velocity,
          }])
        ),
        sprintDeadlines: state.activeSprint
          ? { [state.activeSprint.id]: state.activeSprint.endDate }
          : {},
        costRates: Object.fromEntries(state.team.map(m => [m.userId, m.costRate])),
        overworkIndicators: Object.fromEntries(
          state.team.map(m => [m.userId, {
            score: m.burnoutRisk,
            hoursThisWeek: m.allocatedHours,
            avgHours: m.avgWeeklyHours,
            trend: m.burnoutRisk > 50 ? 'rising' : 'stable',
          }])
        ),
        deliveryConfidence: state.deliveryConfidence,
        cycleType: config.planningCycleType,
      },
    })

    // Generate recommendations
    const recs = generateRecommendations(state, {
      deliverySlippageWeight: config.deliverySlippageWeight,
      costOverrunWeight: config.costOverrunWeight,
      overworkWeight: config.overworkWeight,
      onTimeBonusWeight: config.onTimeBonusWeight,
      maxChangesPerCycle: config.maxChangesPerCycle,
      burnoutThreshold: config.burnoutThreshold,
      overworkHoursWeekly: config.overworkHoursWeekly,
    })

    // Store recommendations
    if (recs.length > 0) {
      await db.recommendation.createMany({
        data: recs.map(rec => ({
          snapshotId: snapshot.id,
          type: rec.type as any,
          title: rec.title,
          description: rec.description,
          reason: rec.reason,
          actionPayload: rec.action as any,
          deliveryProbabilityChange: rec.impact.deliveryProbabilityChange,
          costImpactPercent: rec.impact.costImpactPercent,
          burnoutRiskChange: rec.impact.burnoutRiskChange,
          impactScore: rec.impact.overallScore,
        })),
      })
    }

    // Audit log
    await db.resourceAuditLog.create({
      data: {
        projectId,
        action: 'PLANNING_CYCLE_RUN',
        actorId: userId,
        entityType: 'SNAPSHOT',
        entityId: snapshot.id,
        details: {
          cycleType: config.planningCycleType,
          recommendationsGenerated: recs.length,
          deliveryConfidence: state.deliveryConfidence,
        },
      },
    })

    return { success: true, recommendationCount: recs.length }
  } catch (error) {
    console.error('[RUN_PLANNING_CYCLE]', error)
    return { success: false, error: 'Failed to run planning cycle' }
  }
}

// ==========================================
// Handle Recommendation Decision
// ==========================================
export async function handleRecommendationDecision(
  recommendationId: string,
  decision: 'ACCEPTED' | 'REJECTED' | 'MODIFIED',
  rejectionReason?: string,
  modifiedAction?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Not authenticated' }

    const recommendation = await db.recommendation.findUnique({
      where: { id: recommendationId },
      include: {
        snapshot: { select: { projectId: true } },
      },
    })

    if (!recommendation) return { success: false, error: 'Recommendation not found' }

    // Verify access
    const hasAccess = await db.project.findFirst({
      where: {
        id: recommendation.snapshot.projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
    })
    if (!hasAccess) return { success: false, error: 'Access denied' }

    // Update recommendation
    await db.recommendation.update({
      where: { id: recommendationId },
      data: {
        status: decision,
        decidedBy: userId,
        decidedAt: new Date(),
        rejectionReason: rejectionReason || null,
        modifiedAction: modifiedAction || null,
      },
    })

    // If accepted, apply the action (reassign task, etc.)
    if (decision === 'ACCEPTED' || decision === 'MODIFIED') {
      const action = (modifiedAction || recommendation.actionPayload) as any

      if (action.type === 'REASSIGN_TASK' && action.taskId && action.toUserId) {
        await db.issue.update({
          where: { id: action.taskId },
          data: { assigneeId: action.toUserId },
        })
      }

      if (action.type === 'DELAY_TASK' && action.taskId && action.delayDays) {
        const task = await db.issue.findUnique({ where: { id: action.taskId } })
        if (task?.dueDate) {
          const newDue = new Date(task.dueDate)
          newDue.setDate(newDue.getDate() + action.delayDays)
          await db.issue.update({
            where: { id: action.taskId },
            data: { dueDate: newDue },
          })
        }
      }
    }

    // Audit log
    await db.resourceAuditLog.create({
      data: {
        projectId: recommendation.snapshot.projectId,
        action: `RECOMMENDATION_${decision}`,
        actorId: userId,
        entityType: 'RECOMMENDATION',
        entityId: recommendationId,
        details: {
          type: recommendation.type,
          title: recommendation.title,
          rejectionReason,
        },
      },
    })

    return { success: true }
  } catch (error) {
    console.error('[HANDLE_RECOMMENDATION]', error)
    return { success: false, error: 'Failed to process decision' }
  }
}

// ==========================================
// Update Resource Config
// ==========================================
export async function updateResourceConfig(
  projectId: string,
  updates: {
    deliverySlippageWeight?: number
    costOverrunWeight?: number
    overworkWeight?: number
    onTimeBonusWeight?: number
    maxChangesPerCycle?: number
    learningEnabled?: boolean
    burnoutThreshold?: number
    overworkHoursWeekly?: number
    idleThresholdPercent?: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId } = await auth()
    if (!userId) return { success: false, error: 'Not authenticated' }

    const hasAccess = await db.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId, role: { in: ['OWNER', 'ADMIN'] } } } }],
      },
    })
    if (!hasAccess) return { success: false, error: 'Access denied' }

    await db.resourceConfig.upsert({
      where: { projectId },
      update: updates,
      create: {
        projectId,
        ...updates,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('[UPDATE_RESOURCE_CONFIG]', error)
    return { success: false, error: 'Failed to update config' }
  }
}

// ==========================================
// Update Resource Allocation for a team member
// ==========================================
export async function updateResourceAllocation(
  projectId: string,
  userId: string,
  updates: {
    totalCapacityHours?: number
    hourlyRate?: number
    skillTags?: string[]
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId: authUserId } = await auth()
    if (!authUserId) return { success: false, error: 'Not authenticated' }

    await db.resourceAllocation.upsert({
      where: {
        projectId_userId_sprintId: {
          projectId,
          userId,
          sprintId: '',
        },
      },
      update: {
        totalCapacityHours: updates.totalCapacityHours,
        hourlyRate: updates.hourlyRate,
        skillTags: updates.skillTags,
      },
      create: {
        projectId,
        userId,
        totalCapacityHours: updates.totalCapacityHours || 40,
        hourlyRate: updates.hourlyRate || 0,
        skillTags: updates.skillTags || [],
        allocatedHours: 0,
        availableHours: updates.totalCapacityHours || 40,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('[UPDATE_RESOURCE_ALLOCATION]', error)
    return { success: false, error: 'Failed to update allocation' }
  }
}

// ==========================================
// Get Audit Log
// ==========================================
export async function getResourceAuditLog(
  projectId: string,
  limit: number = 50
): Promise<{ data: any[]; error: string | null }> {
  try {
    const { userId } = await auth()
    if (!userId) return { error: 'Not authenticated', data: [] }

    const logs = await db.resourceAuditLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return {
      data: logs.map(l => ({
        id: l.id,
        action: l.action,
        actorId: l.actorId,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details,
        createdAt: l.createdAt.toISOString(),
      })),
      error: null,
    }
  } catch (error) {
    console.error('[GET_AUDIT_LOG]', error)
    return { error: 'Failed to fetch audit log', data: [] }
  }
}
