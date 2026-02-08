// ==========================================
// Resource Allocation & Scheduling Types
// ==========================================

export type CapacityInfo = {
  userId: string
  userName: string
  totalCapacity: number    // hours/week
  allocatedHours: number
  availableHours: number
  utilizationPercent: number
  velocity: number         // historical velocity multiplier
  skills: string[]
  burnoutRisk: number      // 0-100
  overtimeWeeks: number
  avgWeeklyHours: number
  taskCount: number
  costRate: number
}

export type TaskInfo = {
  id: string
  number: number
  title: string
  type: string
  status: string
  priority: string
  assigneeId: string | null
  assigneeName: string | null
  sprintId: string | null
  dueDate: string | null
  startDate: string | null
  estimatedHours: number
  dependencies: string[]     // parent task IDs
  storyPoints: number
}

export type DeliveryRisk = {
  taskId: string
  taskTitle: string
  taskNumber: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskScore: number         // 0-100
  reasons: string[]
  assigneeId: string | null
  dueDate: string | null
  daysUntilDue: number | null
}

export type TeamUtilization = {
  userId: string
  userName: string
  userImage: string | null
  utilization: number       // 0-100
  status: 'IDLE' | 'NORMAL' | 'BUSY' | 'OVERLOADED'
  taskCount: number
  burnoutRisk: number
}

export type RecommendationAction = {
  type: 'REASSIGN_TASK' | 'DELAY_TASK' | 'SPLIT_TASK' | 'ADD_REVIEWER' | 'SUGGEST_EXTERNAL' | 'REBALANCE_WORKLOAD'
  taskId?: string
  taskTitle?: string
  taskNumber?: number
  fromUserId?: string
  fromUserName?: string
  toUserId?: string
  toUserName?: string
  delayDays?: number
  splitInto?: number
  reason: string
}

export type RecommendationImpact = {
  deliveryProbabilityChange: number  // percentage points
  costImpactPercent: number
  burnoutRiskChange: number
  overallScore: number
}

export type GeneratedRecommendation = {
  type: 'REASSIGN_TASK' | 'DELAY_TASK' | 'SPLIT_TASK' | 'ADD_REVIEWER' | 'SUGGEST_EXTERNAL' | 'REBALANCE_WORKLOAD'
  title: string
  description: string
  reason: string
  action: RecommendationAction
  impact: RecommendationImpact
}

export type PlanningState = {
  tasks: TaskInfo[]
  team: CapacityInfo[]
  risks: DeliveryRisk[]
  deliveryConfidence: number
  activeSprint: {
    id: string
    name: string
    endDate: string | null
    daysRemaining: number | null
  } | null
}

export type ResourcePlanningData = {
  project: {
    id: string
    name: string
    key: string
  }
  state: PlanningState
  utilization: TeamUtilization[]
  recommendations: {
    id: string
    type: string
    status: string
    title: string
    description: string
    reason: string
    actionPayload: RecommendationAction
    deliveryProbabilityChange: number
    costImpactPercent: number
    burnoutRiskChange: number
    impactScore: number
    createdAt: string
    decidedBy: string | null
    decidedAt: string | null
  }[]
  config: {
    deliverySlippageWeight: number
    costOverrunWeight: number
    overworkWeight: number
    onTimeBonusWeight: number
    maxChangesPerCycle: number
    learningEnabled: boolean
    burnoutThreshold: number
    overworkHoursWeekly: number
    idleThresholdPercent: number
  }
  recentOutcomes: {
    id: string
    recommendationType: string
    accepted: boolean
    actualDeliveryChange: number | null
    actualCostChange: number | null
    measuredAt: string
  }[]
  deliveryConfidenceHistory: {
    date: string
    confidence: number
  }[]
}
