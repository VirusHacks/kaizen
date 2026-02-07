// ==========================================
// Multi-Agent Collaboration System — Types
// ==========================================

import type {
  AgentType,
  AgentStatus,
  AgentMessageType,
  AgentMessageStatus,
  AgentDecisionType,
  AgentDecisionStatus,
  AutonomyLevel,
} from '@prisma/client'

export type {
  AgentType,
  AgentStatus,
  AgentMessageType,
  AgentMessageStatus,
  AgentDecisionType,
  AgentDecisionStatus,
  AutonomyLevel,
}

// ==========================================
// Agent Runtime Types
// ==========================================

/** Persisted agent state stored in AgentProfile.currentState */
export type AgentState = {
  activeGoals: string[]
  currentBlockers: string[]
  recentActions: { action: string; timestamp: string; result: string }[]
  mood: 'focused' | 'stressed' | 'idle' | 'collaborative' | 'blocked'
  workloadAssessment: {
    assignedTasks: number
    estimatedHoursRemaining: number
    capacityUtilization: number
    burnoutRisk: number
  }
}

/** Context provided to an agent for each thinking cycle */
export type AgentContext = {
  agentId: string
  agentType: AgentType
  userId: string
  userName: string
  projectId: string
  projectName: string
  autonomyLevel: AutonomyLevel
  trustScore: number

  // Current project state
  teamCapacity: TeamMemberSummary[]
  myTasks: TaskSummary[]
  allTasks: TaskSummary[]
  activeSprint: SprintSummary | null
  deliveryConfidence: number
  risks: RiskSummary[]

  // Recent communications
  pendingMessages: AgentMessageSummary[]
  recentDecisions: AgentDecisionSummary[]

  // My state
  currentState: AgentState
  memory: MemoryEntry[]
}

export type TeamMemberSummary = {
  userId: string
  userName: string
  utilization: number
  burnoutRisk: number
  taskCount: number
  availableHours: number
  skills: string[]
  hasAgent: boolean
  agentId?: string
}

export type TaskSummary = {
  id: string
  number: number
  title: string
  type: string
  status: string
  priority: string
  assigneeId: string | null
  assigneeName: string | null
  estimatedHours: number
  dueDate: string | null
  daysUntilDue: number | null
  dependencies: string[]
  isBlocked: boolean
  isOverdue: boolean
}

export type SprintSummary = {
  id: string
  name: string
  endDate: string | null
  daysRemaining: number | null
  completionPercent: number
  totalTasks: number
  doneTasks: number
}

export type RiskSummary = {
  taskId: string
  taskTitle: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number
  reasons: string[]
}

export type AgentMessageSummary = {
  id: string
  fromAgentType: AgentType
  fromUserName: string
  messageType: AgentMessageType
  subject: string
  payload: Record<string, unknown>
  priority: number
  createdAt: string
  threadId: string | null
}

export type AgentDecisionSummary = {
  id: string
  decisionType: AgentDecisionType
  status: AgentDecisionStatus
  title: string
  confidence: number
  createdAt: string
}

export type MemoryEntry = {
  timestamp: string
  type: 'observation' | 'action' | 'communication' | 'outcome'
  content: string
  importance: number // 1-10
}

// ==========================================
// Agent Action Types
// ==========================================

export type AgentAction =
  | SendMessageAction
  | ProposeDecisionAction
  | UpdateStateAction
  | NoAction

export type SendMessageAction = {
  kind: 'send_message'
  toAgentId: string | null // null = broadcast
  messageType: AgentMessageType
  subject: string
  payload: Record<string, unknown>
  priority: number
  threadId?: string
}

export type ProposeDecisionAction = {
  kind: 'propose_decision'
  decisionType: AgentDecisionType
  title: string
  description: string
  reasoning: string
  confidence: number
  actionPayload: Record<string, unknown>
  impactEstimate: {
    deliveryChange: number
    costChange: number
    burnoutChange: number
  }
  threadId?: string
}

export type UpdateStateAction = {
  kind: 'update_state'
  stateUpdate: Partial<AgentState>
  memoryEntry?: MemoryEntry
}

export type NoAction = {
  kind: 'no_action'
  reason: string
}

/** The full output from one agent thinking cycle */
export type AgentThinkResult = {
  actions: AgentAction[]
  updatedState: AgentState
  newMemory: MemoryEntry[]
  reasoning: string // Full reasoning trace
}

// ==========================================
// Inngest Event Types
// ==========================================

export type AgentEvents = {
  'agent/think': {
    data: {
      agentId: string
      projectId: string
      trigger: 'scheduled' | 'message_received' | 'planning_cycle' | 'manual'
    }
  }
  'agent/message.sent': {
    data: {
      messageId: string
      projectId: string
      fromAgentId: string
      toAgentId: string | null
      messageType: AgentMessageType
    }
  }
  'agent/decision.proposed': {
    data: {
      decisionId: string
      projectId: string
      agentId: string
      decisionType: AgentDecisionType
      confidence: number
    }
  }
  'agent/planning.cycle': {
    data: {
      projectId: string
      initiatedBy: string // agentId or 'system'
    }
  }
  'agent/negotiation.start': {
    data: {
      threadId: string
      projectId: string
      topic: string
      involvedAgentIds: string[]
    }
  }
}
