// ==========================================
// Agent Context Builder
// ==========================================
// Assembles the full context snapshot that each agent
// receives before its LLM thinking cycle.

import { db } from '@/lib/db'
import type {
  AgentContext,
  AgentState,
  TeamMemberSummary,
  TaskSummary,
  SprintSummary,
  RiskSummary,
  AgentMessageSummary,
  AgentDecisionSummary,
  MemoryEntry,
} from './types'

/**
 * Build the full context snapshot for an agent's thinking cycle.
 */
export async function buildAgentContext(agentId: string): Promise<AgentContext> {
  // Load agent + project data with separate targeted queries
  const agent = await db.agentProfile.findUniqueOrThrow({
    where: { id: agentId },
  })

  const [project, members, issues, sprints, allocations, allAgents] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: agent.projectId } }),
    db.projectMember.findMany({
      where: { projectId: agent.projectId },
      include: {
        user: { select: { clerkId: true, name: true, email: true } },
      },
    }),
    db.issue.findMany({
      where: { projectId: agent.projectId, isArchived: false },
      include: {
        assignee: { select: { clerkId: true, name: true, email: true } },
        parent: { select: { id: true, status: true } },
      },
    }),
    db.sprint.findMany({
      where: { projectId: agent.projectId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
    db.resourceAllocation.findMany({
      where: { projectId: agent.projectId },
    }),
    db.agentProfile.findMany({
      where: { projectId: agent.projectId },
    }),
  ])

  const activeSprint = sprints[0] ?? null
  const now = new Date()

  // --- Build Tasks ---
  const allTasks: TaskSummary[] = issues.map((issue) => {
    const due = issue.dueDate ? new Date(issue.dueDate) : null
    const daysUntilDue = due ? Math.ceil((due.getTime() - now.getTime()) / 86400000) : null
    const isBlocked = issue.parent ? issue.parent.status !== 'DONE' : false
    const isOverdue = due ? due < now && issue.status !== 'DONE' : false

    return {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      type: issue.type,
      status: issue.status,
      priority: issue.priority,
      assigneeId: issue.assigneeId,
      assigneeName: issue.assignee?.name ?? issue.assignee?.email ?? null,
      estimatedHours: 8, // default estimate
      dueDate: due?.toISOString() ?? null,
      daysUntilDue,
      dependencies: issue.parentId ? [issue.parentId] : [],
      isBlocked,
      isOverdue,
    }
  })
  const myTasks = allTasks.filter((t) => t.assigneeId === agent.userId)

  // --- Team Capacity ---
  const teamCapacity: TeamMemberSummary[] = members.map((m) => {
    const alloc = allocations.find((a) => a.userId === m.userId)
    const memberTasks = allTasks.filter(
      (t) => t.assigneeId === m.userId && t.status !== 'DONE'
    )
    const allocatedHours = memberTasks.length * 8
    const capacity = alloc?.totalCapacityHours ?? 40
    const available = Math.max(0, capacity - allocatedHours)
    const memberAgent = allAgents.find((a) => a.userId === m.userId)

    return {
      userId: m.userId,
      userName: m.user?.name ?? m.user?.email ?? m.userId,
      utilization: capacity > 0 ? Math.round((allocatedHours / capacity) * 100) : 0,
      burnoutRisk: alloc?.burnoutRiskScore ?? calculateBurnoutRisk(allocatedHours, capacity),
      taskCount: memberTasks.length,
      availableHours: available,
      skills: alloc?.skillTags ?? [],
      hasAgent: !!memberAgent,
      agentId: memberAgent?.id,
    }
  })

  // --- Sprint Summary ---
  let sprintSummary: SprintSummary | null = null
  if (activeSprint) {
    const sprintIssues = allTasks.filter((t) =>
      issues.some((i) => i.id === t.id && i.sprintId === activeSprint.id)
    )
    const doneTasks = sprintIssues.filter((t) => t.status === 'DONE')
    const end = activeSprint.endDate ? new Date(activeSprint.endDate) : null
    sprintSummary = {
      id: activeSprint.id,
      name: activeSprint.name,
      endDate: end?.toISOString() ?? null,
      daysRemaining: end
        ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
        : null,
      completionPercent:
        sprintIssues.length > 0
          ? Math.round((doneTasks.length / sprintIssues.length) * 100)
          : 0,
      totalTasks: sprintIssues.length,
      doneTasks: doneTasks.length,
    }
  }

  // --- Risks ---
  const risks: RiskSummary[] = allTasks
    .filter(
      (t) =>
        t.isOverdue ||
        t.isBlocked ||
        t.priority === 'CRITICAL' ||
        t.priority === 'HIGH'
    )
    .map((t) => ({
      taskId: t.id,
      taskTitle: t.title,
      riskLevel: t.isOverdue
        ? ('CRITICAL' as const)
        : t.isBlocked
          ? ('HIGH' as const)
          : t.priority === 'CRITICAL'
            ? ('HIGH' as const)
            : ('MEDIUM' as const),
      riskScore: t.isOverdue ? 90 : t.isBlocked ? 75 : 50,
      reasons: [
        ...(t.isOverdue
          ? [`Overdue by ${Math.abs(t.daysUntilDue ?? 0)} days`]
          : []),
        ...(t.isBlocked ? ['Blocked by dependency'] : []),
        ...(t.priority === 'CRITICAL' ? ['Critical priority'] : []),
      ],
    }))

  // --- Delivery Confidence (simple calc) ---
  const activeTasks = allTasks.filter((t) => t.status !== 'DONE')
  let deliveryConfidence = 100
  const overdueTasks = activeTasks.filter((t) => t.isOverdue)
  deliveryConfidence -= overdueTasks.length * 8
  const overloaded = teamCapacity.filter((m) => m.utilization > 100)
  deliveryConfidence -= overloaded.length * 5
  const blockedTasks = activeTasks.filter((t) => t.isBlocked)
  deliveryConfidence -= blockedTasks.length * 4
  deliveryConfidence = Math.max(0, Math.min(100, deliveryConfidence))

  // --- Pending Messages ---
  const pendingMsgs = await db.agentMessage.findMany({
    where: {
      projectId: agent.projectId,
      OR: [{ toAgentId: agentId }, { toAgentId: null }],
      status: 'PENDING',
    },
    include: { fromAgent: true },
    orderBy: { priority: 'asc' },
    take: 20,
  })

  const pendingMessages: AgentMessageSummary[] = pendingMsgs.map((m) => ({
    id: m.id,
    fromAgentType: m.fromAgent.agentType,
    fromUserName: m.fromAgent.userId,
    messageType: m.messageType,
    subject: m.subject,
    payload: m.payload as Record<string, unknown>,
    priority: m.priority,
    createdAt: m.createdAt.toISOString(),
    threadId: m.threadId,
  }))

  // --- Recent Decisions ---
  const recentDecs = await db.agentDecision.findMany({
    where: { projectId: agent.projectId, agentId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const recentDecisions: AgentDecisionSummary[] = recentDecs.map((d) => ({
    id: d.id,
    decisionType: d.decisionType,
    status: d.status,
    title: d.title,
    confidence: d.confidence,
    createdAt: d.createdAt.toISOString(),
  }))

  // --- Agent user name ---
  const agentMember = members.find((m) => m.userId === agent.userId)
  const userName =
    agentMember?.user?.name ?? agentMember?.user?.email ?? agent.userId

  // Safely parse currentState with defaults for missing fields
  const rawState = agent.currentState as Partial<AgentState> | null
  const currentState: AgentState = {
    activeGoals: rawState?.activeGoals ?? [],
    currentBlockers: rawState?.currentBlockers ?? [],
    recentActions: rawState?.recentActions ?? [],
    mood: rawState?.mood ?? 'idle',
    workloadAssessment: rawState?.workloadAssessment ?? {
      assignedTasks: 0,
      estimatedHoursRemaining: 0,
      capacityUtilization: 0,
      burnoutRisk: 0,
    },
  }

  return {
    agentId: agent.id,
    agentType: agent.agentType,
    userId: agent.userId,
    userName,
    projectId: agent.projectId,
    projectName: project.name,
    autonomyLevel: 'SUGGEST', // default
    trustScore: agent.trustScore,
    teamCapacity,
    myTasks,
    allTasks,
    activeSprint: sprintSummary,
    deliveryConfidence,
    risks,
    pendingMessages,
    recentDecisions,
    currentState,
    memory: Array.isArray(agent.memory) ? (agent.memory as MemoryEntry[]) : [],
  }
}

// ==========================================
// Helpers
// ==========================================

function calculateBurnoutRisk(allocated: number, capacity: number): number {
  if (capacity <= 0) return 0
  const ratio = allocated / capacity
  if (ratio <= 0.7) return 10
  if (ratio <= 0.85) return 25
  if (ratio <= 1.0) return 45
  if (ratio <= 1.15) return 70
  return 90
}

export function defaultAgentState(): AgentState {
  return {
    activeGoals: [],
    currentBlockers: [],
    recentActions: [],
    mood: 'idle',
    workloadAssessment: {
      assignedTasks: 0,
      estimatedHoursRemaining: 0,
      capacityUtilization: 0,
      burnoutRisk: 0,
    },
  }
}
