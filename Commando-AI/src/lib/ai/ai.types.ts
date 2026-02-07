import { z } from 'zod'

// ============================================
// AI Request Types
// ============================================

export const AIRequestContextSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  projectDescription: z.string().nullable(),
  projectKey: z.string(),
})

export type AIRequestContext = z.infer<typeof AIRequestContextSchema>

// ============================================
// AI Generated Task Types
// ============================================

export const AIGeneratedTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  estimatedEffort: z.string().nullable().optional(),
  suggestedAssigneeId: z.string().nullable().optional(),
  suggestedAssigneeName: z.string().nullable().optional(),
})

export const AITaskGenerationResponseSchema = z.object({
  tasks: z.array(AIGeneratedTaskSchema),
  reasoning: z.string().optional(),
})

export type AIGeneratedTask = z.infer<typeof AIGeneratedTaskSchema>
export type AITaskGenerationResponse = z.infer<typeof AITaskGenerationResponseSchema>

// ============================================
// AI Assignee Suggestion Types
// ============================================

export const AIAlternativeAssigneeSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string().optional(),
})

export const AIAssigneeSuggestionSchema = z.object({
  suggestedAssigneeId: z.string(),
  suggestedAssigneeName: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alternativeAssignees: z.array(AIAlternativeAssigneeSchema).optional(),
})

export type AIAlternativeAssignee = z.infer<typeof AIAlternativeAssigneeSchema>
export type AIAssigneeSuggestion = z.infer<typeof AIAssigneeSuggestionSchema>

// ============================================
// AI Sprint Planning Types
// ============================================

export const AISprintTaskSchema = z.object({
  issueId: z.string(),
  issueKey: z.string().optional(),
  title: z.string(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  estimatedEffort: z.number().nullable().optional(),
  reason: z.string().optional(),
})

export const AICapacityAnalysisSchema = z.object({
  availableCapacity: z.number(),
  totalPlannedEffort: z.number(),
  utilizationPercent: z.number(),
  recommendation: z.string().optional(),
})

export const AISprintPlanSchema = z.object({
  suggestedGoal: z.string(),
  recommendedTasks: z.array(AISprintTaskSchema),
  deferredTasks: z.array(AISprintTaskSchema),
  warnings: z.array(z.string()).optional(),
  capacityAnalysis: AICapacityAnalysisSchema.optional(),
})

export type AISprintTask = z.infer<typeof AISprintTaskSchema>
export type AICapacityAnalysis = z.infer<typeof AICapacityAnalysisSchema>
export type AISprintPlan = z.infer<typeof AISprintPlanSchema>

// ============================================
// AI Timeline Suggestion Types
// ============================================

export const AITimelineSuggestionSchema = z.object({
  issueId: z.string(),
  issueTitle: z.string(),
  suggestedStartDate: z.string().nullable(),
  suggestedDueDate: z.string().nullable(),
  reasoning: z.string().optional(),
  warnings: z.array(z.string()).optional(),
})

export const AITimelineResponseSchema = z.object({
  suggestions: z.array(AITimelineSuggestionSchema),
  overallRecommendation: z.string().optional(),
  risks: z.array(z.object({
    type: z.enum(['deadline', 'dependency', 'resource', 'scope']),
    description: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
  })).optional(),
})

export type AITimelineSuggestion = z.infer<typeof AITimelineSuggestionSchema>
export type AITimelineResponse = z.infer<typeof AITimelineResponseSchema>

// ============================================
// AI Project Summary Types
// ============================================

export const AIKeyMetricSchema = z.object({
  name: z.string(),
  value: z.string(),
  change: z.string().optional(),
  trend: z.enum(['UP', 'DOWN', 'STABLE']).optional(),
})

export const AIRiskSchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  mitigation: z.string().optional(),
})

export const AIBlockerSchema = z.object({
  issueKey: z.string(),
  title: z.string(),
  reason: z.string(),
  suggestedAction: z.string().optional(),
})

export const AIRecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  category: z.string().optional(),
  expectedImpact: z.string().optional(),
})

export const AIWeeklyHighlightSchema = z.object({
  type: z.enum(['ACHIEVEMENT', 'MILESTONE', 'CONCERN', 'UPDATE']),
  description: z.string(),
})

export const AIProjectSummarySchema = z.object({
  summary: z.string(),
  progressNarrative: z.string().optional(),
  keyMetrics: z.array(AIKeyMetricSchema).optional(),
  risks: z.array(AIRiskSchema).optional(),
  blockers: z.array(AIBlockerSchema).optional(),
  recommendations: z.array(AIRecommendationSchema).optional(),
  weeklyHighlights: z.array(AIWeeklyHighlightSchema).optional(),
})

export type AIKeyMetric = z.infer<typeof AIKeyMetricSchema>
export type AIRisk = z.infer<typeof AIRiskSchema>
export type AIBlocker = z.infer<typeof AIBlockerSchema>
export type AIRecommendation = z.infer<typeof AIRecommendationSchema>
export type AIWeeklyHighlight = z.infer<typeof AIWeeklyHighlightSchema>
export type AIProjectSummary = z.infer<typeof AIProjectSummarySchema>

// ============================================
// AI Request/Response Logging Types
// ============================================

export type AIActionType =
  | 'generate_tasks'
  | 'suggest_assignee'
  | 'plan_sprint'
  | 'suggest_timeline'
  | 'project_summary'

export interface AIRequestLog {
  id: string
  timestamp: Date
  userId: string
  projectId: string
  action: AIActionType
  prompt: string
  response: string | null
  error: string | null
  durationMs: number
  tokensUsed?: number
}

// ============================================
// AI Configuration
// ============================================

export interface AIConfig {
  model: string
  temperature: number
  maxOutputTokens: number
  topP: number
  topK: number
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  model: 'gemini-2.5-flash',
  temperature: 0.4,
  maxOutputTokens: 4096,
  topP: 0.95,
  topK: 40,
}

// ============================================
// AI Error Types
// ============================================

export type AIErrorCode =
  | 'API_ERROR'
  | 'RATE_LIMIT'
  | 'INVALID_RESPONSE'
  | 'VALIDATION_ERROR'
  | 'CONTEXT_TOO_LONG'
  | 'UNAUTHORIZED'
  | 'UNKNOWN'

export class AIError extends Error {
  constructor(
    message: string,
    public code: AIErrorCode,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AIError'
  }
}
