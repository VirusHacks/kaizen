// ==========================================
// Agent Message Bus
// ==========================================
// Handles sending, receiving, and routing messages
// between agents. Also handles decision persistence
// and state persistence after each think cycle.

import { db } from '@/lib/db'
import type {
  AgentAction,
  AgentThinkResult,
  SendMessageAction,
  ProposeDecisionAction,
} from './types'
import type {
  AgentMessageType,
  AgentDecisionType,
} from '@prisma/client'

// ==========================================
// Message Operations
// ==========================================

/**
 * Send a message from one agent to another (or broadcast).
 * Returns the created message ID.
 */
export async function sendAgentMessage(
  fromAgentId: string,
  projectId: string,
  action: SendMessageAction
): Promise<string> {
  const msg = await db.agentMessage.create({
    data: {
      projectId,
      fromAgentId,
      toAgentId: action.toAgentId,
      messageType: action.messageType as AgentMessageType,
      status: 'PENDING',
      priority: action.priority,
      subject: action.subject,
      payload: action.payload as object,
      threadId: action.threadId ?? crypto.randomUUID(),
    },
  })
  return msg.id
}

/**
 * Acknowledge a message (mark as read).
 */
export async function acknowledgeMessage(messageId: string): Promise<void> {
  await db.agentMessage.update({
    where: { id: messageId },
    data: {
      status: 'ACKNOWLEDGED',
      readAt: new Date(),
    },
  })
}

/**
 * Expire old unresolved messages (older than 24h by default).
 */
export async function expireOldMessages(
  projectId: string,
  maxAgeHours: number = 24
): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
  const result = await db.agentMessage.updateMany({
    where: {
      projectId,
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    data: { status: 'EXPIRED' },
  })
  return result.count
}

// ==========================================
// Decision Operations
// ==========================================

/**
 * Create a new decision proposal from an agent.
 */
export async function proposeDecision(
  agentId: string,
  projectId: string,
  action: ProposeDecisionAction
): Promise<string> {
  const decision = await db.agentDecision.create({
    data: {
      projectId,
      agentId,
      decisionType: action.decisionType as AgentDecisionType,
      status: action.confidence >= 0.85 ? 'APPROVED_BY_AGENT' : 'PROPOSED',
      title: action.title,
      description: action.description,
      reasoning: action.reasoning,
      confidence: action.confidence,
      actionPayload: action.actionPayload as object,
      impactEstimate: action.impactEstimate as object,
      relatedThreadId: action.threadId,
    },
  })
  return decision.id
}

/**
 * Human approves or rejects a decision.
 */
export async function reviewDecision(
  decisionId: string,
  approved: boolean,
  reviewerId: string,
  note?: string
): Promise<void> {
  await db.agentDecision.update({
    where: { id: decisionId },
    data: {
      status: approved ? 'APPROVED_BY_HUMAN' : 'REJECTED_BY_HUMAN',
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note,
    },
  })

  // Update trust score based on human feedback
  const decision = await db.agentDecision.findUnique({
    where: { id: decisionId },
    include: { agent: true },
  })
  if (decision) {
    const newAccepted = decision.agent.decisionsAccepted + (approved ? 1 : 0)
    const newTotal = decision.agent.decisionsProposed + 1
    const newTrust = newTotal > 0 ? newAccepted / newTotal : 0.5

    await db.agentProfile.update({
      where: { id: decision.agentId },
      data: {
        decisionsProposed: { increment: 1 },
        decisionsAccepted: approved ? { increment: 1 } : undefined,
        trustScore: newTrust,
      },
    })
  }
}

// ==========================================
// State Persistence
// ==========================================

/**
 * Process all actions from a think cycle and persist to DB.
 */
export async function processThinkResult(
  agentId: string,
  projectId: string,
  result: AgentThinkResult
): Promise<{
  messageIds: string[]
  decisionIds: string[]
}> {
  const messageIds: string[] = []
  const decisionIds: string[] = []

  for (const action of result.actions) {
    switch (action.kind) {
      case 'send_message': {
        const msgId = await sendAgentMessage(agentId, projectId, action)
        messageIds.push(msgId)
        break
      }
      case 'propose_decision': {
        const decId = await proposeDecision(agentId, projectId, action)
        decisionIds.push(decId)
        break
      }
      case 'update_state':
      case 'no_action':
        // Handled below in state update
        break
    }
  }

  // Persist state + memory
  const agent = await db.agentProfile.findUnique({ where: { id: agentId } })
  const currentMemory = (agent?.memory as unknown[]) ?? []
  const updatedMemory = [...result.newMemory, ...currentMemory].slice(0, 50) // Keep last 50 entries

  await db.agentProfile.update({
    where: { id: agentId },
    data: {
      currentState: result.updatedState as object,
      memory: updatedMemory as object[],
      lastRunAt: new Date(),
      totalInteractions: { increment: 1 },
    },
  })

  // Acknowledge any pending messages that were processed
  // (the agent "read" them during context building)
  const pendingMsgs = await db.agentMessage.findMany({
    where: {
      projectId,
      OR: [{ toAgentId: agentId }, { toAgentId: null }],
      status: 'PENDING',
    },
    select: { id: true },
  })
  if (pendingMsgs.length > 0) {
    await db.agentMessage.updateMany({
      where: {
        id: { in: pendingMsgs.map(m => m.id) },
      },
      data: {
        status: 'ACKNOWLEDGED',
        readAt: new Date(),
      },
    })
  }

  return { messageIds, decisionIds }
}

// ==========================================
// Agent Registry
// ==========================================

/**
 * Get all active agents for a project.
 */
export async function getProjectAgents(projectId: string) {
  return db.agentProfile.findMany({
    where: { projectId, status: 'ACTIVE' },
    orderBy: { agentType: 'asc' },
  })
}

/**
 * Ensure all team members have agent profiles created.
 * Returns the count of newly created agents.
 */
export async function ensureProjectAgents(projectId: string): Promise<number> {
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      members: true,
      agentProfiles: true,
    },
  })

  let created = 0
  for (const member of project.members) {
    const existing = project.agentProfiles.find(
      a => a.userId === member.userId && a.agentType === 'DEVELOPER'
    )
    if (!existing) {
      await db.agentProfile.create({
        data: {
          projectId,
          userId: member.userId,
          agentType: 'DEVELOPER',
          status: 'ACTIVE',
        },
      })
      created++
    }
  }

  // Ensure one MANAGER agent (assigned to the project owner)
  const hasManager = project.agentProfiles.some(a => a.agentType === 'MANAGER')
  if (!hasManager) {
    const owner = project.members.find(m => m.role === 'ADMIN') ?? project.members[0]
    if (owner) {
      await db.agentProfile.create({
        data: {
          projectId,
          userId: owner.userId,
          agentType: 'MANAGER',
          status: 'ACTIVE',
        },
      })
      created++
    }
  }

  // Ensure one OPTIMIZER agent (system-level, assigned to owner)
  const hasOptimizer = project.agentProfiles.some(a => a.agentType === 'OPTIMIZER')
  if (!hasOptimizer) {
    const owner = project.members.find(m => m.role === 'ADMIN') ?? project.members[0]
    if (owner) {
      await db.agentProfile.create({
        data: {
          projectId,
          userId: owner.userId,
          agentType: 'OPTIMIZER',
          status: 'ACTIVE',
        },
      })
      created++
    }
  }

  return created
}
