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
