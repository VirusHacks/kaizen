'use server'

// ==========================================
// Agent Collaboration — Server Actions
// ==========================================

import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { inngest } from '@/lib/inngest/client'
import { ensureProjectAgents, reviewDecision, processThinkResult, expireOldMessages } from '@/lib/agents/message-bus'
import { buildAgentContext } from '@/lib/agents/context-builder'
import { getAgent } from '@/lib/agents/factory'
import type { AgentDecisionStatus } from '@prisma/client'
import { geminiClient } from '@/lib/ai/gemini.client'

// ==========================================
// Initialize agents for a project
// ==========================================

export async function initializeAgents(projectId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const created = await ensureProjectAgents(projectId)

  // Fetch all agents after ensuring
  const agents = await db.agentProfile.findMany({
    where: { projectId },
    orderBy: { agentType: 'asc' },
  })

  return { created, agents }
}

// ==========================================
// Trigger a planning cycle (DIRECT EXECUTION)
// ==========================================
// Runs the entire planning cycle synchronously without
// needing Inngest dev server. This calls each agent's
// think cycle in order: Optimizer → Manager → Developers

export async function triggerPlanningCycle(projectId: string) {
  console.log('[AGENT] triggerPlanningCycle called for project:', projectId)
  
  const { userId } = await auth()
  if (!userId) {
    console.log('[AGENT] Unauthorized - no userId')
    throw new Error('Unauthorized')
  }
  console.log('[AGENT] User authenticated:', userId)

  const results: {
    agentId: string
    agentType: string
    actionsCount: number
    reasoning: string
    error?: string
  }[] = []

  try {
    // Step 1: Cleanup old messages
    console.log('[AGENT] Step 1: Cleaning up old messages...')
    await expireOldMessages(projectId, 48)

    // Step 2: Get all active agents
    console.log('[AGENT] Step 2: Fetching active agents...')
    const agents = await db.agentProfile.findMany({
      where: { projectId, status: 'ACTIVE' },
      orderBy: { agentType: 'asc' },
    })
    console.log('[AGENT] Found agents:', agents.length, agents.map(a => a.agentType))

    if (agents.length === 0) {
      console.log('[AGENT] No active agents found!')
      return { triggered: true, results: [], error: 'No active agents found. Click Initialize Agents first.' }
    }

    const optimizer = agents.find(a => a.agentType === 'OPTIMIZER')
    const manager = agents.find(a => a.agentType === 'MANAGER')
    const developers = agents.filter(a => a.agentType === 'DEVELOPER')
    console.log('[AGENT] Optimizer:', !!optimizer, 'Manager:', !!manager, 'Developers:', developers.length)

    // Step 3: Run optimizer first (gets the big picture)
    if (optimizer) {
      console.log('[AGENT] Step 3: Running OPTIMIZER...')
      try {
        const ctx = await buildAgentContext(optimizer.id)
        console.log('[AGENT] Built context for optimizer, calling LLM...')
        const agentImpl = getAgent('OPTIMIZER')
        const result = await agentImpl.think(ctx)
        console.log('[AGENT] Optimizer think complete, actions:', result.actions.length)
        await processThinkResult(optimizer.id, projectId, result)
        results.push({
          agentId: optimizer.id,
          agentType: 'OPTIMIZER',
          actionsCount: result.actions.length,
          reasoning: result.reasoning.substring(0, 200),
        })
      } catch (err: any) {
        console.error('[AGENT] Optimizer error:', err.message)
        results.push({
          agentId: optimizer.id,
          agentType: 'OPTIMIZER',
          actionsCount: 0,
          reasoning: '',
          error: err.message,
        })
      }
    }

    // Step 4: Run manager (processes optimizer's output)
    if (manager) {
      try {
        const ctx = await buildAgentContext(manager.id)
        const agentImpl = getAgent('MANAGER')
        const result = await agentImpl.think(ctx)
        await processThinkResult(manager.id, projectId, result)
        results.push({
          agentId: manager.id,
          agentType: 'MANAGER',
          actionsCount: result.actions.length,
          reasoning: result.reasoning.substring(0, 200),
        })
      } catch (err: any) {
        results.push({
          agentId: manager.id,
          agentType: 'MANAGER',
          actionsCount: 0,
          reasoning: '',
          error: err.message,
        })
      }
    }

    // Step 5: Run all developer agents
    for (const dev of developers) {
      try {
        const ctx = await buildAgentContext(dev.id)
        const agentImpl = getAgent('DEVELOPER')
        const result = await agentImpl.think(ctx)
        await processThinkResult(dev.id, projectId, result)
        results.push({
          agentId: dev.id,
          agentType: 'DEVELOPER',
          actionsCount: result.actions.length,
          reasoning: result.reasoning.substring(0, 200),
        })
      } catch (err: any) {
        results.push({
          agentId: dev.id,
          agentType: 'DEVELOPER',
          actionsCount: 0,
          reasoning: '',
          error: err.message,
        })
      }
    }

    return { triggered: true, results }
  } catch (err: any) {
    return { triggered: false, results, error: err.message }
  }
}

// ==========================================
// Trigger a single agent's think cycle (DIRECT)
// ==========================================

export async function triggerAgentThink(agentId: string, projectId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const agent = await db.agentProfile.findUnique({
    where: { id: agentId },
  })

  if (!agent || agent.status !== 'ACTIVE') {
    return { triggered: false, error: 'Agent not found or inactive' }
  }

  try {
    const ctx = await buildAgentContext(agentId)
    const agentImpl = getAgent(agent.agentType)
    const result = await agentImpl.think(ctx)
    await processThinkResult(agentId, projectId, result)

    return {
      triggered: true,
      agentType: agent.agentType,
      actionsCount: result.actions.length,
      reasoning: result.reasoning.substring(0, 200),
    }
  } catch (err: any) {
    return { triggered: false, error: err.message }
  }
}

// ==========================================
// Get agent dashboard data
// ==========================================

export async function getAgentDashboardData(projectId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const [agents, recentMessages, pendingDecisions, recentDecisions, messageStats] =
    await Promise.all([
      // All agents
      db.agentProfile.findMany({
        where: { projectId },
        orderBy: { agentType: 'asc' },
      }),

      // Recent messages (last 50)
      db.agentMessage.findMany({
        where: { projectId },
        include: {
          fromAgent: true,
          toAgent: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Pending decisions (need human review)
      db.agentDecision.findMany({
        where: {
          projectId,
          status: { in: ['PROPOSED', 'APPROVED_BY_AGENT', 'PENDING_HUMAN'] },
        },
        include: { agent: true },
        orderBy: { createdAt: 'desc' },
      }),

      // Recent decided
      db.agentDecision.findMany({
        where: {
          projectId,
          status: {
            in: ['APPROVED_BY_HUMAN', 'REJECTED_BY_HUMAN', 'AUTO_EXECUTED'],
          },
        },
        include: { agent: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Message counts by type
      db.agentMessage.groupBy({
        by: ['messageType'],
        where: { projectId },
        _count: { id: true },
      }),
    ])

  // Build activity feed from messages
  const activityFeed = recentMessages.map(m => ({
    id: m.id,
    type: 'message' as const,
    timestamp: m.createdAt.toISOString(),
    fromAgent: {
      id: m.fromAgent.id,
      type: m.fromAgent.agentType,
      userId: m.fromAgent.userId,
    },
    toAgent: m.toAgent
      ? {
          id: m.toAgent.id,
          type: m.toAgent.agentType,
          userId: m.toAgent.userId,
        }
      : null,
    messageType: m.messageType,
    subject: m.subject,
    payload: m.payload as Record<string, unknown>,
    status: m.status,
    priority: m.priority,
    threadId: m.threadId,
  }))

  // Agent profiles with computed stats
  const agentProfiles = agents.map(a => ({
    id: a.id,
    userId: a.userId,
    agentType: a.agentType,
    status: a.status,
    trustScore: a.trustScore,
    decisionsProposed: a.decisionsProposed,
    decisionsAccepted: a.decisionsAccepted,
    totalInteractions: a.totalInteractions,
    lastRunAt: a.lastRunAt?.toISOString() ?? null,
    currentState: a.currentState as Record<string, unknown>,
    createdAt: a.createdAt.toISOString(),
  }))

  // Pending decisions with action details
  const pendingApprovals = pendingDecisions.map(d => ({
    id: d.id,
    agentId: d.agent.id,
    agentType: d.agent.agentType,
    agentUserId: d.agent.userId,
    decisionType: d.decisionType,
    status: d.status as AgentDecisionStatus,
    title: d.title,
    description: d.description,
    reasoning: d.reasoning,
    confidence: d.confidence,
    actionPayload: d.actionPayload as Record<string, unknown>,
    impactEstimate: d.impactEstimate as Record<string, unknown>,
    createdAt: d.createdAt.toISOString(),
  }))

  const decidedHistory = recentDecisions.map(d => ({
    id: d.id,
    agentType: d.agent.agentType,
    decisionType: d.decisionType,
    status: d.status as AgentDecisionStatus,
    title: d.title,
    confidence: d.confidence,
    reviewedBy: d.reviewedBy,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }))

  const messageTypeStats = messageStats.reduce(
    (acc, s) => {
      acc[s.messageType] = s._count.id
      return acc
    },
    {} as Record<string, number>
  )

  return {
    agents: agentProfiles,
    activityFeed,
    pendingApprovals,
    decidedHistory,
    messageTypeStats,
    summary: {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'ACTIVE').length,
      pendingApprovalCount: pendingDecisions.length,
      totalMessages: recentMessages.length,
      avgTrustScore:
        agents.length > 0
          ? agents.reduce((s, a) => s + a.trustScore, 0) / agents.length
          : 0,
    },
  }
}

// ==========================================
// Approve / Reject a decision
// ==========================================

export async function handleDecisionReview(
  decisionId: string,
  approved: boolean,
  note?: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await reviewDecision(decisionId, approved, userId, note)

  return { success: true }
}

// ==========================================
// Toggle agent status (pause / activate)
// ==========================================

export async function toggleAgentStatus(agentId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const agent = await db.agentProfile.findUniqueOrThrow({
    where: { id: agentId },
  })

  const newStatus = agent.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
  await db.agentProfile.update({
    where: { id: agentId },
    data: { status: newStatus },
  })

  return { status: newStatus }
}

// ==========================================
// Get conversation threads
// ==========================================

export async function getConversationThread(
  projectId: string,
  threadId: string
) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const messages = await db.agentMessage.findMany({
    where: { projectId, threadId },
    include: {
      fromAgent: true,
      toAgent: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return messages.map(m => ({
    id: m.id,
    fromAgent: {
      id: m.fromAgent.id,
      type: m.fromAgent.agentType,
      userId: m.fromAgent.userId,
    },
    toAgent: m.toAgent
      ? {
          id: m.toAgent.id,
          type: m.toAgent.agentType,
          userId: m.toAgent.userId,
        }
      : null,
    messageType: m.messageType,
    subject: m.subject,
    payload: m.payload as Record<string, unknown>,
    reasoning: m.reasoning,
    status: m.status,
    priority: m.priority,
    createdAt: m.createdAt.toISOString(),
  }))
}

// ==========================================
// Cost Estimation & Sprint Health Data
// ==========================================

export type CostEstimationData = {
  totalTeamCostPerSprint: number
  spentSoFar: number
  projectedTotal: number
  burnRate: number // cost per day
  costEfficiency: number // tasks completed per $1000
  memberCosts: {
    userId: string
    userName: string
    hourlyRate: number
    allocatedHours: number
    cost: number
    tasksCompleted: number
    costPerTask: number
  }[]
  costSavingOpportunities: {
    type: string
    title: string
    description: string
    potentialSaving: number
    confidence: number
  }[]
}

export type SprintHealthData = {
  overallScore: number
  dimensions: {
    name: string
    score: number
    status: 'healthy' | 'warning' | 'critical'
    details: string
  }[]
  riskFactors: {
    factor: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    detail: string
  }[]
  recommendations: string[]
}

/**
 * Compute cost estimation and sprint health data from real project state.
 */
export async function getCostAndHealthData(projectId: string): Promise<{
  cost: CostEstimationData
  health: SprintHealthData
}> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  // Parallel queries
  const [project, members, issues, activeSprint, allocations, config] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId } }),
    db.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { clerkId: true, name: true, email: true } } },
    }),
    db.issue.findMany({
      where: { projectId, isArchived: false },
      include: {
        assignee: { select: { clerkId: true, name: true } },
      },
    }),
    db.sprint.findFirst({
      where: { projectId, status: 'ACTIVE' },
    }),
    db.resourceAllocation.findMany({
      where: { projectId },
    }),
    db.resourceConfig.findFirst({
      where: { projectId },
    }),
  ])

  const now = new Date()
  const DEFAULT_HOURLY_RATE = 50

  // ---- COST ESTIMATION ----
  const memberCosts = members.map((m) => {
    const alloc = allocations.find((a) => a.userId === m.userId)
    const hourlyRate = alloc?.hourlyRate ?? DEFAULT_HOURLY_RATE
    const memberIssues = issues.filter((i) => i.assigneeId === m.userId)
    const activeIssues = memberIssues.filter((i) => i.status !== 'DONE')
    const completedIssues = memberIssues.filter((i) => i.status === 'DONE')
    const allocatedHours = activeIssues.length * 8 // estimate 8h per task
    const cost = allocatedHours * hourlyRate

    return {
      userId: m.userId,
      userName: m.user?.name ?? m.user?.email ?? m.userId,
      hourlyRate,
      allocatedHours,
      cost,
      tasksCompleted: completedIssues.length,
      costPerTask: completedIssues.length > 0
        ? Math.round((completedIssues.length * 8 * hourlyRate) / completedIssues.length)
        : 0,
    }
  })

  const totalTeamCostPerSprint = memberCosts.reduce((s, m) => s + m.cost, 0)

  // Sprint timeline for burn rate
  let sprintDays = 14
  let sprintElapsedDays = 0
  if (activeSprint) {
    const start = activeSprint.startDate ?? activeSprint.createdAt
    const end = activeSprint.endDate ?? new Date(start.getTime() + 14 * 86400000)
    sprintDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
    sprintElapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000))
  }

  const completedCount = issues.filter((i) => i.status === 'DONE').length
  const totalCount = issues.length
  const completionRatio = totalCount > 0 ? completedCount / totalCount : 0

  // Spent so far is based on elapsed time ratio of total
  const spentSoFar = Math.round(totalTeamCostPerSprint * Math.min(1, sprintElapsedDays / sprintDays))
  const burnRate = sprintDays > 0 ? Math.round(totalTeamCostPerSprint / sprintDays) : 0

  // Project cost at completion using velocity
  const velocityRatio = sprintElapsedDays > 0 ? completionRatio / (sprintElapsedDays / sprintDays) : 1
  const projectedTotal = velocityRatio > 0
    ? Math.round(totalTeamCostPerSprint / velocityRatio)
    : totalTeamCostPerSprint * 2

  const costEfficiency = totalTeamCostPerSprint > 0
    ? Math.round((completedCount / (totalTeamCostPerSprint / 1000)) * 100) / 100
    : 0

  // Identify cost-saving opportunities
  const costSavingOpportunities: CostEstimationData['costSavingOpportunities'] = []

  // Overloaded high-cost members
  const highCostOverloaded = memberCosts.filter(
    (m) => m.hourlyRate > DEFAULT_HOURLY_RATE && m.allocatedHours > 40
  )
  for (const mc of highCostOverloaded) {
    const excessHours = mc.allocatedHours - 40
    costSavingOpportunities.push({
      type: 'REBALANCE',
      title: `Rebalance ${mc.userName}'s workload`,
      description: `${mc.userName} ($${mc.hourlyRate}/hr) is overloaded with ${mc.allocatedHours}h. Redistributing ${excessHours}h to lower-cost members could save ~$${excessHours * (mc.hourlyRate - DEFAULT_HOURLY_RATE)}.`,
      potentialSaving: excessHours * (mc.hourlyRate - DEFAULT_HOURLY_RATE),
      confidence: 0.75,
    })
  }

  // Unassigned tasks (idle cost)
  const unassigned = issues.filter((i) => !i.assigneeId && i.status !== 'DONE')
  if (unassigned.length > 0) {
    costSavingOpportunities.push({
      type: 'ASSIGN',
      title: `${unassigned.length} unassigned task(s) causing idle cost`,
      description: `Unassigned tasks delay delivery, extending sprint duration and increasing team idle cost. Assigning them to available members could accelerate completion.`,
      potentialSaving: unassigned.length * 8 * burnRate / (sprintDays > 0 ? sprintDays : 1),
      confidence: 0.8,
    })
  }

  // Overdue tasks (rework cost risk)
  const overdue = issues.filter((i) => {
    if (i.status === 'DONE' || !i.dueDate) return false
    return new Date(i.dueDate) < now
  })
  if (overdue.length > 0) {
    costSavingOpportunities.push({
      type: 'EXPEDITE',
      title: `${overdue.length} overdue task(s) — rework risk`,
      description: `Overdue tasks often require context-switching and rework, inflating costs by 15-30%. Expediting these prevents cascading delays.`,
      potentialSaving: overdue.length * 4 * DEFAULT_HOURLY_RATE,
      confidence: 0.65,
    })
  }

  // Velocity drop detection
  if (velocityRatio < 0.7 && sprintElapsedDays > 3) {
    const overrun = projectedTotal - totalTeamCostPerSprint
    costSavingOpportunities.push({
      type: 'SCOPE',
      title: `Sprint trending ${Math.round((1 - velocityRatio) * 100)}% slower than planned`,
      description: `At current velocity the sprint will cost ~$${projectedTotal} vs planned $${totalTeamCostPerSprint}. Consider reducing scope by ${Math.round((1 - velocityRatio) * totalCount)} tasks to stay on budget.`,
      potentialSaving: overrun > 0 ? overrun : 0,
      confidence: 0.7,
    })
  }

  const costData: CostEstimationData = {
    totalTeamCostPerSprint,
    spentSoFar,
    projectedTotal,
    burnRate,
    costEfficiency,
    memberCosts,
    costSavingOpportunities,
  }

  // ---- SPRINT HEALTH DIAGNOSTIC ----
  const activeTasks = issues.filter((i) => i.status !== 'DONE')
  const inProgressTasks = issues.filter((i) => i.status === 'IN_PROGRESS')
  const inReviewTasks = issues.filter((i) => i.status === 'IN_REVIEW')
  const blockedTasks = issues.filter((i) => {
    // Simple blocked detection: has parent that isn't DONE
    return false // TODO: Use parentId relation if loaded
  })

  // Dimension scores (each 0-100)
  const dimensions: SprintHealthData['dimensions'] = []

  // 1. Velocity / Progress
  const expectedCompletion = sprintDays > 0 ? sprintElapsedDays / sprintDays : 0
  const actualCompletion = completionRatio
  const velocityScore = expectedCompletion > 0
    ? Math.min(100, Math.round((actualCompletion / expectedCompletion) * 100))
    : (completedCount > 0 ? 80 : 50)
  dimensions.push({
    name: 'Velocity',
    score: velocityScore,
    status: velocityScore >= 70 ? 'healthy' : velocityScore >= 40 ? 'warning' : 'critical',
    details: `${completedCount}/${totalCount} tasks done (${Math.round(completionRatio * 100)}%). ${
      velocityScore >= 70 ? 'On track.' : velocityScore >= 40 ? 'Slightly behind pace.' : 'Significantly behind pace.'
    }`,
  })

  // 2. Workload Balance
  const utilizations = memberCosts.map((m) => m.allocatedHours / 40 * 100)
  const avgUtil = utilizations.length > 0 ? utilizations.reduce((s, u) => s + u, 0) / utilizations.length : 0
  const overloaded = utilizations.filter((u) => u > 100).length
  const underloaded = utilizations.filter((u) => u < 30).length
  const balanceScore = Math.max(0, 100 - overloaded * 20 - underloaded * 10 - Math.abs(avgUtil - 80) * 0.5)
  dimensions.push({
    name: 'Workload Balance',
    score: Math.round(balanceScore),
    status: balanceScore >= 70 ? 'healthy' : balanceScore >= 40 ? 'warning' : 'critical',
    details: `Avg utilization ${Math.round(avgUtil)}%. ${overloaded} overloaded, ${underloaded} underutilized members.`,
  })

  // 3. Scope Creep / Sizing
  const todoRatio = totalCount > 0 ? issues.filter((i) => i.status === 'TODO').length / totalCount : 0
  const scopeScore = Math.round(Math.max(0, 100 - todoRatio * 80 - (unassigned.length > 3 ? 20 : 0)))
  dimensions.push({
    name: 'Scope Health',
    score: scopeScore,
    status: scopeScore >= 70 ? 'healthy' : scopeScore >= 40 ? 'warning' : 'critical',
    details: `${Math.round(todoRatio * 100)}% tasks still in TODO. ${unassigned.length} unassigned.`,
  })

  // 4. Quality (bug ratio)
  const bugCount = issues.filter((i) => i.type === 'BUG' && i.status !== 'DONE').length
  const bugRatio = totalCount > 0 ? bugCount / totalCount : 0
  const qualityScore = Math.round(Math.max(0, 100 - bugRatio * 200 - overdue.length * 10))
  dimensions.push({
    name: 'Quality',
    score: qualityScore,
    status: qualityScore >= 70 ? 'healthy' : qualityScore >= 40 ? 'warning' : 'critical',
    details: `${bugCount} active bugs (${Math.round(bugRatio * 100)}% of tasks). ${overdue.length} overdue tasks.`,
  })

  // 5. Cost Efficiency
  const costScore = velocityRatio >= 0.9 ? 90 :
    velocityRatio >= 0.7 ? 70 :
    velocityRatio >= 0.5 ? 50 : 30
  dimensions.push({
    name: 'Cost Efficiency',
    score: costScore,
    status: costScore >= 70 ? 'healthy' : costScore >= 40 ? 'warning' : 'critical',
    details: `Burn rate $${burnRate}/day. ${
      projectedTotal > totalTeamCostPerSprint * 1.1
        ? `Projected ${Math.round(((projectedTotal / totalTeamCostPerSprint) - 1) * 100)}% over budget.`
        : 'Within budget.'
    }`,
  })

  // 6. Team Morale (inferred from burnout risk)
  const burnoutRisks = allocations.map((a) => a.burnoutRiskScore ?? 0)
  const avgBurnout = burnoutRisks.length > 0 ? burnoutRisks.reduce((s, b) => s + b, 0) / burnoutRisks.length : 0
  const moraleScore = Math.round(Math.max(0, 100 - avgBurnout))
  dimensions.push({
    name: 'Team Morale',
    score: moraleScore,
    status: moraleScore >= 70 ? 'healthy' : moraleScore >= 40 ? 'warning' : 'critical',
    details: `Avg burnout risk ${Math.round(avgBurnout)}%. ${
      burnoutRisks.filter((b) => b > 70).length
    } member(s) at high risk.`,
  })

  // Overall score (weighted average)
  const weights = [0.25, 0.15, 0.15, 0.15, 0.15, 0.15] // velocity weighted highest
  const overallScore = Math.round(
    dimensions.reduce((s, d, i) => s + d.score * (weights[i] || 0.15), 0)
  )

  // Risk factors
  const riskFactors: SprintHealthData['riskFactors'] = []
  if (overdue.length > 0) {
    riskFactors.push({
      factor: `${overdue.length} overdue task(s)`,
      severity: overdue.length > 3 ? 'critical' : overdue.length > 1 ? 'high' : 'medium',
      detail: `Tasks past deadline: ${overdue.slice(0, 3).map((i) => i.title).join(', ')}${overdue.length > 3 ? '...' : ''}`,
    })
  }
  if (overloaded > 0) {
    riskFactors.push({
      factor: `${overloaded} overloaded team member(s)`,
      severity: overloaded > 2 ? 'critical' : 'high',
      detail: `Members exceeding capacity increase burnout risk and reduce output quality.`,
    })
  }
  if (unassigned.length > 2) {
    riskFactors.push({
      factor: `${unassigned.length} unassigned tasks`,
      severity: unassigned.length > 5 ? 'high' : 'medium',
      detail: `Unassigned work won't be completed. Consider triaging or assigning.`,
    })
  }
  if (bugRatio > 0.2) {
    riskFactors.push({
      factor: `High bug ratio (${Math.round(bugRatio * 100)}%)`,
      severity: bugRatio > 0.4 ? 'critical' : 'high',
      detail: `Bug injection rate is elevated. Consider pausing feature work to stabilize.`,
    })
  }
  if (velocityRatio < 0.6 && sprintElapsedDays > 3) {
    riskFactors.push({
      factor: `Velocity ${Math.round((1 - velocityRatio) * 100)}% below target`,
      severity: velocityRatio < 0.4 ? 'critical' : 'high',
      detail: `Sprint is significantly behind pace. Consider scope reduction or team augmentation.`,
    })
  }

  // Auto-generate recommendations
  const recommendations: string[] = []
  if (velocityScore < 60) recommendations.push('Consider reducing sprint scope to focus on high-priority deliverables.')
  if (overloaded > 0) recommendations.push(`Rebalance workload — ${overloaded} member(s) are over 100% capacity.`)
  if (unassigned.length > 0) recommendations.push(`Assign ${unassigned.length} unassigned task(s) to available team members.`)
  if (bugRatio > 0.15) recommendations.push('Dedicate a bug-fix day to reduce active bug count before adding new features.')
  if (moraleScore < 50) recommendations.push('Schedule a team check-in — burnout risk is elevated across the team.')
  if (costScore < 60) recommendations.push('Review cost allocation — sprint is trending over budget.')
  if (inReviewTasks.length > 3) recommendations.push(`${inReviewTasks.length} tasks stuck in review — prioritize code reviews to unblock flow.`)
  if (recommendations.length === 0) recommendations.push('Sprint is on track! Keep up the momentum.')

  const healthData: SprintHealthData = {
    overallScore,
    dimensions,
    riskFactors,
    recommendations,
  }

  return { cost: costData, health: healthData }
}

// ==========================================
// AI Cost Optimization Analysis
// ==========================================

export async function runCostOptimizationAnalysis(projectId: string): Promise<{
  analysis: string
  suggestions: { title: string; impact: string; effort: string; saving: string }[]
  error?: string
}> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  try {
    const { cost, health } = await getCostAndHealthData(projectId)

    const prompt = `You are a cost optimization AI agent for a software project.

## Current Sprint Cost Data:
- Total team cost/sprint: $${cost.totalTeamCostPerSprint}
- Spent so far: $${cost.spentSoFar}
- Projected total: $${cost.projectedTotal}
- Burn rate: $${cost.burnRate}/day
- Cost efficiency: ${cost.costEfficiency} tasks per $1000

## Team Costs:
${cost.memberCosts.map((m) => `- ${m.userName}: $${m.hourlyRate}/hr, ${m.allocatedHours}h allocated, ${m.tasksCompleted} completed, $${m.cost} total`).join('\n')}

## Existing Savings Opportunities:
${cost.costSavingOpportunities.map((o) => `- [${o.type}] ${o.title}: ~$${o.potentialSaving} saving`).join('\n') || 'None identified'}

## Sprint Health Score: ${health.overallScore}/100
${health.dimensions.map((d) => `- ${d.name}: ${d.score}/100 (${d.status})`).join('\n')}

Analyze this data and provide:
1. A brief 2-3 sentence analysis of the cost situation
2. 3-5 specific actionable suggestions to optimize costs

Return JSON:
{
  "analysis": "brief analysis text",
  "suggestions": [
    { "title": "short title", "impact": "High/Medium/Low", "effort": "Low/Medium/High", "saving": "$X" }
  ]
}`

    const result = await geminiClient.generateJSON(
      'You are a project cost optimization analyst. Return valid JSON only.',
      prompt,
      (data: any) => data as { analysis: string; suggestions: { title: string; impact: string; effort: string; saving: string }[] },
      { temperature: 0.2, maxTokens: 1500 }
    )

    return { analysis: result.data.analysis, suggestions: result.data.suggestions }
  } catch (error: any) {
    console.error('[COST_OPTIMIZATION] AI analysis failed:', error)
    return {
      analysis: 'Unable to run AI cost analysis at this time.',
      suggestions: [],
      error: error.message,
    }
  }
}