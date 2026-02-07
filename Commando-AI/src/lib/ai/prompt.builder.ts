import { IssueType, IssuePriority, IssueStatus, ProjectRole } from '@prisma/client'

/**
 * Prompt Builder
 * Constructs well-structured prompts for each AI capability
 */

// ============================================
// Common Prompt Components
// ============================================

const JSON_INSTRUCTION = `
IMPORTANT: You MUST respond with valid JSON only. No explanations, no markdown formatting outside the JSON.
Wrap your JSON response in \`\`\`json code blocks.
`

const ISSUE_TYPE_GUIDE = `
Issue Types:
- EPIC: Large feature or initiative spanning multiple sprints
- STORY: User-facing feature that delivers value
- TASK: Technical work or implementation task
- BUG: Defect or issue to fix
- SUBTASK: Smaller piece of work under a parent issue
`

const PRIORITY_GUIDE = `
Priorities:
- CRITICAL: Must be done immediately, blocking issue
- HIGH: Important, should be done soon
- MEDIUM: Normal priority
- LOW: Nice to have, can wait
`

// ============================================
// Task Generation Prompts
// ============================================

export interface TaskGenerationContext {
  project: {
    name: string
    description: string | null
    key: string
  }
  existingIssues: Array<{
    title: string
    type: IssueType
    status: IssueStatus
    priority: IssuePriority
  }>
  teamMembers?: Array<{
    id: string
    name: string | null
    email: string
    role: ProjectRole | 'OWNER'
    openTasksCount: number
  }>
  projectGoal?: string
  additionalContext?: string
}

export function buildTaskGenerationPrompt(context: TaskGenerationContext): {
  system: string
  user: string
} {
  const system = `You are an expert project manager AI assistant. Your task is to analyze project context and generate relevant, actionable tasks.

${ISSUE_TYPE_GUIDE}

${PRIORITY_GUIDE}

Guidelines:
- Generate tasks that are specific, measurable, and actionable
- Consider the existing issues to avoid duplicates
- Prioritize based on project needs and dependencies
- Use clear, professional language for titles and descriptions
- If team members are provided, suggest assignees based on workload balance

${JSON_INSTRUCTION}

Response Schema:
{
  "tasks": [
    {
      "title": "string (concise, action-oriented)",
      "description": "string (detailed explanation, acceptance criteria if applicable)",
      "type": "EPIC | STORY | TASK | BUG | SUBTASK",
      "priority": "CRITICAL | HIGH | MEDIUM | LOW",
      "estimatedEffort": "string (e.g., '2 hours', '1 day', '1 week') or null",
      "suggestedAssigneeId": "string (team member id) or null",
      "suggestedAssigneeName": "string (team member name) or null"
    }
  ],
  "reasoning": "string (brief explanation of your task generation approach)"
}`

  const existingIssuesSummary = context.existingIssues.length > 0
    ? context.existingIssues.map((i) => `- [${i.type}/${i.status}] ${i.title}`).join('\n')
    : 'No existing issues yet.'

  const teamMembersSummary = context.teamMembers && context.teamMembers.length > 0
    ? context.teamMembers.map((m) => `- ${m.name || m.email} (${m.role}, ${m.openTasksCount} open tasks)`).join('\n')
    : 'No team member data available.'

  const user = `Project: ${context.project.name}
Project Key: ${context.project.key}
Description: ${context.project.description || 'No description provided'}

${context.projectGoal ? `Project Goal: ${context.projectGoal}` : ''}

Existing Issues (${context.existingIssues.length} total):
${existingIssuesSummary}

Team Members:
${teamMembersSummary}

${context.additionalContext ? `Additional Context: ${context.additionalContext}` : ''}

Based on this project context, generate 5-8 relevant tasks that would help move this project forward. Consider:
1. What tasks are missing but needed?
2. What logical next steps would follow the existing work?
3. Are there any foundational tasks that should be prioritized?
4. Balance the workload if assigning to team members.`

  return { system, user }
}

// ============================================
// Assignee Suggestion Prompts
// ============================================

export interface AssigneeSuggestionContext {
  issue: {
    title: string
    description: string | null
    type: IssueType
    priority: IssuePriority
    status: IssueStatus
  }
  teamMembers: Array<{
    id: string
    name: string | null
    email: string
    role: ProjectRole | 'OWNER'
    openTasksCount: number
    recentAssignments?: string[]
  }>
  projectContext?: string
}

export function buildAssigneeSuggestionPrompt(context: AssigneeSuggestionContext): {
  system: string
  user: string
} {
  const system = `You are an AI assistant helping to assign tasks to team members. Your goal is to recommend the best assignee based on:
- Team member roles and expertise (inferred from recent work)
- Current workload (number of open tasks)
- Task requirements and complexity
- Balanced distribution of work

${JSON_INSTRUCTION}

Response Schema:
{
  "suggestedAssigneeId": "string (the recommended team member's id)",
  "suggestedAssigneeName": "string (the recommended team member's name)",
  "confidence": "high | medium | low",
  "reasoning": "string (brief explanation of why this person is the best fit)",
  "alternativeAssignees": [
    {
      "id": "string",
      "name": "string",
      "reason": "string (why they could also work)"
    }
  ]
}`

  const teamMembersList = context.teamMembers.map((m) => {
    const recentWork = m.recentAssignments && m.recentAssignments.length > 0
      ? `Recent: ${m.recentAssignments.slice(0, 3).join(', ')}`
      : 'No recent assignments'
    return `- ID: ${m.id}
  Name: ${m.name || m.email}
  Role: ${m.role}
  Open Tasks: ${m.openTasksCount}
  ${recentWork}`
  }).join('\n\n')

  const user = `Task to Assign:
Title: ${context.issue.title}
Type: ${context.issue.type}
Priority: ${context.issue.priority}
Status: ${context.issue.status}
Description: ${context.issue.description || 'No description'}

${context.projectContext ? `Project Context: ${context.projectContext}` : ''}

Available Team Members:
${teamMembersList}

Recommend the best team member to assign this task to, considering their workload and the task requirements.`

  return { system, user }
}

// ============================================
// Sprint Planning Prompts
// ============================================

export interface SprintPlanningContext {
  project: {
    name: string
    description: string | null
  }
  backlogIssues: Array<{
    id: string
    title: string
    type: IssueType
    priority: IssuePriority
    status: IssueStatus
    assignee?: { id: string; name: string | null } | null
  }>
  teamMembers: Array<{
    id: string
    name: string | null
    openTasksCount: number
    role: ProjectRole | 'OWNER'
  }>
  sprintDuration?: number // in days
  previousSprints?: Array<{
    name: string
    goal: string | null
    completedIssues: number
    totalIssues: number
  }>
}

export function buildSprintPlanningPrompt(context: SprintPlanningContext): {
  system: string
  user: string
} {
  const system = `You are an expert Agile coach AI assistant helping to plan sprints. Your goal is to:
- Suggest a meaningful sprint goal based on the backlog
- Recommend which issues to include in the sprint
- Identify issues that should be deferred
- Warn about potential problems (overload, dependencies, etc.)

${PRIORITY_GUIDE}

${JSON_INSTRUCTION}

Response Schema:
{
  "suggestedGoal": "string (clear, achievable sprint goal)",
  "recommendedTasks": [
    {
      "issueId": "string",
      "issueTitle": "string",
      "action": "include",
      "reason": "string (optional)"
    }
  ],
  "deferredTasks": [
    {
      "issueId": "string",
      "issueTitle": "string",
      "action": "defer",
      "reason": "string (why this should wait)"
    }
  ],
  "warnings": [
    {
      "type": "overload | dependency | timeline | capacity",
      "message": "string",
      "affectedMember": "string or null"
    }
  ],
  "capacityAnalysis": {
    "recommendation": "string (overall capacity assessment)"
  }
}`

  const backlogList = context.backlogIssues.map((i) => 
    `- ID: ${i.id} | [${i.type}/${i.priority}] ${i.title}${i.assignee ? ` (Assigned: ${i.assignee.name || 'Unknown'})` : ''}`
  ).join('\n')

  const teamCapacity = context.teamMembers.map((m) =>
    `- ${m.name || 'Unknown'} (${m.role}): ${m.openTasksCount} open tasks`
  ).join('\n')

  const sprintHistory = context.previousSprints && context.previousSprints.length > 0
    ? context.previousSprints.map((s) => 
        `- ${s.name}: ${s.completedIssues}/${s.totalIssues} completed${s.goal ? ` (Goal: ${s.goal})` : ''}`
      ).join('\n')
    : 'No sprint history available.'

  const user = `Project: ${context.project.name}
${context.project.description ? `Description: ${context.project.description}` : ''}

Sprint Duration: ${context.sprintDuration || 14} days

Backlog Issues (${context.backlogIssues.length} total):
${backlogList}

Team Capacity:
${teamCapacity}

Previous Sprints:
${sprintHistory}

Please create a sprint plan that:
1. Sets a clear, achievable sprint goal
2. Selects appropriate issues for the sprint (aim for ${Math.min(context.backlogIssues.length, 8-12)} issues)
3. Considers team capacity and current workload
4. Identifies any risks or warnings`

  return { system, user }
}

// ============================================
// Timeline Suggestion Prompts
// ============================================

export interface TimelineSuggestionContext {
  project: {
    name: string
    description: string | null
  }
  issues: Array<{
    id: string
    title: string
    type: IssueType
    priority: IssuePriority
    status: IssueStatus
    currentStartDate: string | null
    currentDueDate: string | null
  }>
  activeSprint?: {
    name: string
    startDate: string | null
    endDate: string | null
  }
}

export function buildTimelineSuggestionPrompt(context: TimelineSuggestionContext): {
  system: string
  user: string
} {
  const system = `You are an AI assistant helping to plan project timelines. Your goal is to:
- Suggest realistic start and due dates for issues
- Consider issue priorities and dependencies
- Identify potential timeline risks
- Ensure dates are achievable

Guidelines:
- High priority issues should start sooner
- Consider typical task durations based on type (EPIC: weeks, STORY: days, TASK: hours-days, BUG: hours-days)
- Leave buffer time for unexpected issues
- Don't overlap too many high-priority items

Today's date: ${new Date().toISOString().split('T')[0]}

${JSON_INSTRUCTION}

Response Schema:
{
  "suggestions": [
    {
      "issueId": "string",
      "issueTitle": "string",
      "suggestedStartDate": "YYYY-MM-DD or null",
      "suggestedDueDate": "YYYY-MM-DD or null",
      "reasoning": "string (optional)",
      "warnings": ["string"] (optional)
    }
  ],
  "overallRecommendation": "string (summary of timeline approach)",
  "risks": [
    {
      "type": "deadline | dependency | resource | scope",
      "description": "string",
      "severity": "high | medium | low"
    }
  ]
}`

  const issueList = context.issues.map((i) => {
    const dates = i.currentStartDate || i.currentDueDate
      ? `Current: ${i.currentStartDate || '?'} → ${i.currentDueDate || '?'}`
      : 'No dates set'
    return `- ID: ${i.id} | [${i.type}/${i.priority}/${i.status}] ${i.title} | ${dates}`
  }).join('\n')

  const sprintInfo = context.activeSprint
    ? `Active Sprint: ${context.activeSprint.name} (${context.activeSprint.startDate || '?'} → ${context.activeSprint.endDate || '?'})`
    : 'No active sprint'

  const user = `Project: ${context.project.name}
${context.project.description ? `Description: ${context.project.description}` : ''}

${sprintInfo}

Issues needing timeline suggestions (${context.issues.length} total):
${issueList}

Please suggest appropriate start dates and due dates for these issues, considering:
1. Priority levels
2. Task complexity (based on type)
3. Realistic timeframes
4. Any potential risks`

  return { system, user }
}

// ============================================
// Project Summary Prompts
// ============================================

export interface ProjectSummaryContext {
  project: {
    name: string
    description: string | null
    createdAt: string
  }
  stats: {
    totalIssues: number
    byStatus: Record<IssueStatus, number>
    byPriority: Record<string, number>
    overdueCount: number
  }
  activeSprint?: {
    name: string
    goal: string | null
    progress: number
    daysRemaining: number
  }
  recentActivity: Array<{
    title: string
    status: IssueStatus
    updatedAt: string
  }>
  teamSize: number
}

export function buildProjectSummaryPrompt(context: ProjectSummaryContext): {
  system: string
  user: string
} {
  const system = `You are an AI project analyst providing executive summaries. Your goal is to:
- Summarize project status clearly and concisely
- Highlight progress and achievements
- Identify risks and blockers
- Provide actionable recommendations

Be professional, data-driven, and constructive.

${JSON_INSTRUCTION}

Response Schema:
{
  "summary": "string (2-3 sentence executive summary)",
  "progressNarrative": "string (detailed progress description)",
  "keyMetrics": {
    "completionRate": "string (e.g., '65% complete')",
    "velocity": "string (optional)",
    "burndownTrend": "string (optional)"
  },
  "risks": [
    {
      "title": "string",
      "description": "string",
      "severity": "high | medium | low",
      "recommendation": "string (optional)"
    }
  ],
  "blockers": [
    {
      "title": "string",
      "description": "string",
      "affectedIssues": ["string"] (optional)
    }
  ],
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "priority": "high | medium | low"
    }
  ],
  "weeklyHighlights": ["string"] (optional, 2-3 key highlights)
}`

  const statusBreakdown = Object.entries(context.stats.byStatus)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ')

  const priorityBreakdown = Object.entries(context.stats.byPriority)
    .map(([priority, count]) => `${priority}: ${count}`)
    .join(', ')

  const recentActivitySummary = context.recentActivity.slice(0, 5)
    .map((a) => `- [${a.status}] ${a.title} (${new Date(a.updatedAt).toLocaleDateString()})`)
    .join('\n')

  const sprintInfo = context.activeSprint
    ? `Active Sprint: ${context.activeSprint.name}
  Goal: ${context.activeSprint.goal || 'Not set'}
  Progress: ${context.activeSprint.progress}%
  Days Remaining: ${context.activeSprint.daysRemaining}`
    : 'No active sprint'

  const user = `Project: ${context.project.name}
Description: ${context.project.description || 'No description'}
Created: ${new Date(context.project.createdAt).toLocaleDateString()}
Team Size: ${context.teamSize} members

Issue Statistics:
- Total: ${context.stats.totalIssues}
- By Status: ${statusBreakdown}
- By Priority: ${priorityBreakdown}
- Overdue: ${context.stats.overdueCount}

${sprintInfo}

Recent Activity:
${recentActivitySummary || 'No recent activity'}

Please provide a comprehensive project summary including:
1. Executive summary
2. Progress narrative
3. Key risks and blockers
4. Actionable recommendations`

  return { system, user }
}
