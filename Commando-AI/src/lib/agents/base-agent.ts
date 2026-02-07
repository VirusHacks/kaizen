// ==========================================
// Base Agent — LLM-powered thinking core
// ==========================================
// Each agent subclass provides its own system prompt
// and can override action validation. The base handles:
// - Building prompts from context
// - Calling the LLM
// - Parsing structured actions
// - Persisting state updates

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type {
  AgentContext,
  AgentThinkResult,
  AgentAction,
  AgentState,
  MemoryEntry,
  SendMessageAction,
  ProposeDecisionAction,
} from './types'

// ==========================================
// Abstract Agent Base
// ==========================================

export abstract class BaseAgent {
  abstract readonly agentRole: string
  abstract readonly systemPrompt: string

  /**
   * Build additional role-specific context that gets appended to the prompt.
   * Override in subclasses to provide specialized guidance.
   */
  protected abstract buildRoleContext(ctx: AgentContext): string

  /**
   * Validate actions proposed by the LLM. Return filtered valid actions.
   */
  protected validateActions(actions: AgentAction[], ctx: AgentContext): AgentAction[] {
    return actions.filter(a => {
      if (a.kind === 'propose_decision') {
        // Must have confidence between 0 and 1
        if (a.confidence < 0 || a.confidence > 1) return false
        // Decisions need actual substance
        if (!a.title || !a.reasoning) return false
      }
      if (a.kind === 'send_message') {
        if (!a.subject || !a.messageType) return false
      }
      return true
    })
  }

  /**
   * Main thinking cycle. Called by Inngest on schedule or event.
   */
  async think(ctx: AgentContext): Promise<AgentThinkResult> {
    const prompt = this.buildPrompt(ctx)

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: this.systemPrompt,
      prompt,
      temperature: 0.3,
      maxTokens: 4000,
    })

    const result = this.parseResponse(text, ctx)

    // Validate
    result.actions = this.validateActions(result.actions, ctx)

    return result
  }

  // ==========================================
  // Prompt Construction
  // ==========================================

  private buildPrompt(ctx: AgentContext): string {
    const sections: string[] = []

    // Identity
    sections.push(`## Your Identity
You are the ${this.agentRole} agent for **${ctx.userName}** on the **${ctx.projectName}** project.
Your trust score: ${(ctx.trustScore * 100).toFixed(0)}%
Autonomy level: ${ctx.autonomyLevel}`)

    // Current state (with safe defaults)
    const goals = ctx.currentState?.activeGoals ?? []
    const blockers = ctx.currentState?.currentBlockers ?? []
    const mood = ctx.currentState?.mood ?? 'idle'
    const workload = ctx.currentState?.workloadAssessment ?? { assignedTasks: 0, estimatedHoursRemaining: 0, capacityUtilization: 0, burnoutRisk: 0 }
    
    sections.push(`## Your Current State
Active goals: ${goals.length > 0 ? goals.join(', ') : 'None'}
Current blockers: ${blockers.length > 0 ? blockers.join(', ') : 'None'}
Mood: ${mood}
Workload: ${workload.assignedTasks} tasks, ${workload.estimatedHoursRemaining}h remaining, ${workload.capacityUtilization}% utilization`)

    // Project overview
    sections.push(`## Project Status
Delivery Confidence: ${ctx.deliveryConfidence}%
${ctx.activeSprint ? `Active Sprint: ${ctx.activeSprint.name} — ${ctx.activeSprint.daysRemaining} days left, ${ctx.activeSprint.completionPercent}% complete (${ctx.activeSprint.doneTasks}/${ctx.activeSprint.totalTasks})` : 'No active sprint'}`)

    // My tasks
    if (ctx.myTasks.length > 0) {
      sections.push(`## My Tasks (${ctx.myTasks.length})
${ctx.myTasks.map(t => `- [${t.status}] #${t.number} "${t.title}" (${t.priority}, ${t.estimatedHours}h${t.isOverdue ? ' ⚠️ OVERDUE' : ''}${t.isBlocked ? ' 🔒 BLOCKED' : ''}${t.daysUntilDue !== null ? `, due in ${t.daysUntilDue}d` : ''})`).join('\n')}`)
    }

    // Team overview
    sections.push(`## Team
${ctx.teamCapacity.map(m => `- ${m.userName}: ${m.utilization}% utilized, ${m.taskCount} tasks, ${m.availableHours}h free, burnout risk: ${m.burnoutRisk}%${m.hasAgent ? ' [has agent]' : ''}`).join('\n')}`)

    // Risks
    if (ctx.risks && ctx.risks.length > 0) {
      sections.push(`## Active Risks
${ctx.risks.map(r => `- ${r.riskLevel}: "${r.taskTitle}" — ${(r.reasons ?? []).join(', ')}`).join('\n')}`)
    }

    // Pending messages
    if (ctx.pendingMessages && ctx.pendingMessages.length > 0) {
      sections.push(`## Incoming Messages (unread)
${ctx.pendingMessages.map(m => `- [${m.messageType}] from ${m.fromAgentType} agent (priority ${m.priority}): "${m.subject}"
  Payload: ${JSON.stringify(m.payload)}`).join('\n\n')}`)
    }

    // Recent decisions
    if (ctx.recentDecisions.length > 0) {
      sections.push(`## Recent Decisions
${ctx.recentDecisions.map(d => `- [${d.status}] ${d.decisionType}: "${d.title}" (confidence: ${(d.confidence * 100).toFixed(0)}%)`).join('\n')}`)
    }

    // Role-specific context
    const roleCtx = this.buildRoleContext(ctx)
    if (roleCtx) {
      sections.push(roleCtx)
    }

    // Action format instructions
    sections.push(`## Response Format
Respond with a JSON object with these fields:
{
  "reasoning": "Your thinking process...",
  "mood": "focused|stressed|idle|collaborative|blocked",
  "activeGoals": ["goal1", "goal2"],
  "currentBlockers": ["blocker1"],
  "actions": [
    {
      "kind": "send_message",
      "toAgentId": "agent-id or null for broadcast",
      "messageType": "HELP_REQUEST|TASK_OFFER|NEGOTIATION_PROPOSAL|STATUS_UPDATE|ALERT|BROADCAST",
      "subject": "Brief subject line",
      "payload": { ... },
      "priority": 5
    },
    {
      "kind": "propose_decision",
      "decisionType": "TASK_REASSIGNMENT|DEADLINE_EXTENSION|HELP_REQUEST|WORKLOAD_REBALANCE|BLOCKER_ESCALATION|REVIEW_ASSIGNMENT|SPRINT_REPLANNING|BURNOUT_ALERT",
      "title": "Short title",
      "description": "What should happen",
      "reasoning": "Why this is the right call",
      "confidence": 0.8,
      "actionPayload": { "taskId": "...", "fromUser": "...", "toUser": "..." },
      "impactEstimate": { "deliveryChange": 5, "costChange": -2, "burnoutChange": -10 }
    },
    {
      "kind": "no_action",
      "reason": "Everything looks good right now"
    }
  ]
}

RULES:
- Be specific and actionable. Reference actual task numbers and team members.
- Only propose decisions you're confident about (>60% confidence).
- Prefer negotiation over unilateral decisions when other agents are involved.
- If you have pending messages, respond to them first.
- Keep actions to 1-3 per cycle. Don't over-act.
- Your autonomy level is ${ctx.autonomyLevel}. ${getAutonomyGuidance(ctx.autonomyLevel)}`)

    return sections.join('\n\n')
  }

  // ==========================================
  // Response Parsing
  // ==========================================

  private parseResponse(text: string, ctx: AgentContext): AgentThinkResult {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        actions: [{ kind: 'no_action', reason: 'Failed to parse LLM response' }],
        updatedState: ctx.currentState,
        newMemory: [{
          timestamp: new Date().toISOString(),
          type: 'observation',
          content: 'Failed to parse LLM response',
          importance: 3,
        }],
        reasoning: text,
      }
    }

    try {
      const parsed = JSON.parse(jsonMatch[0])
      const actions: AgentAction[] = (parsed.actions ?? []).map((a: Record<string, unknown>) => {
        if (a.kind === 'send_message') {
          return {
            kind: 'send_message',
            toAgentId: a.toAgentId ?? null,
            messageType: a.messageType ?? 'STATUS_UPDATE',
            subject: a.subject ?? 'Update',
            payload: a.payload ?? {},
            priority: a.priority ?? 5,
            threadId: a.threadId,
          } as SendMessageAction
        }
        if (a.kind === 'propose_decision') {
          return {
            kind: 'propose_decision',
            decisionType: a.decisionType ?? 'WORKLOAD_REBALANCE',
            title: a.title ?? 'Decision',
            description: a.description ?? '',
            reasoning: a.reasoning ?? parsed.reasoning ?? '',
            confidence: a.confidence ?? 0.5,
            actionPayload: a.actionPayload ?? {},
            impactEstimate: (a.impactEstimate as { deliveryChange: number; costChange: number; burnoutChange: number }) ?? {
              deliveryChange: 0,
              costChange: 0,
              burnoutChange: 0,
            },
            threadId: a.threadId,
          } as ProposeDecisionAction
        }
        return { kind: 'no_action', reason: a.reason ?? 'No action needed' } as AgentAction
      })

      const updatedState: AgentState = {
        activeGoals: parsed.activeGoals ?? ctx.currentState.activeGoals,
        currentBlockers: parsed.currentBlockers ?? ctx.currentState.currentBlockers,
        recentActions: [
          ...actions.map(a => ({
            action: a.kind,
            timestamp: new Date().toISOString(),
            result: 'pending',
          })),
          ...ctx.currentState.recentActions.slice(0, 10),
        ],
        mood: parsed.mood ?? ctx.currentState.mood,
        workloadAssessment: {
          assignedTasks: ctx.myTasks.length,
          estimatedHoursRemaining: ctx.myTasks.reduce((s, t) => s + t.estimatedHours, 0),
          capacityUtilization: ctx.teamCapacity.find(m => m.userId === ctx.userId)?.utilization ?? 0,
          burnoutRisk: ctx.teamCapacity.find(m => m.userId === ctx.userId)?.burnoutRisk ?? 0,
        },
      }

      const newMemory: MemoryEntry[] = [{
        timestamp: new Date().toISOString(),
        type: 'observation',
        content: `Think cycle: ${parsed.reasoning?.substring(0, 200) ?? 'No reasoning'}`,
        importance: 5,
      }]

      return {
        actions,
        updatedState,
        newMemory,
        reasoning: parsed.reasoning ?? text,
      }
    } catch {
      return {
        actions: [{ kind: 'no_action', reason: 'JSON parse error in LLM response' }],
        updatedState: ctx.currentState,
        newMemory: [],
        reasoning: text,
      }
    }
  }
}

// ==========================================
// Autonomy Level Guidance
// ==========================================

function getAutonomyGuidance(level: string): string {
  switch (level) {
    case 'MONITOR':
      return 'You can ONLY observe and report. Do not propose any decisions.'
    case 'SUGGEST':
      return 'You can propose decisions for human approval. All decisions require human sign-off.'
    case 'NEGOTIATE':
      return 'You can negotiate with other agents. Agreed-upon actions still need human approval.'
    case 'LOW_RISK':
      return 'You can auto-execute low-risk actions (task status updates, messages). High-impact decisions need human approval.'
    case 'FULL_AUTO':
      return 'You have full autonomy. Execute decisions and report in daily digest. Only escalate if confidence < 60%.'
    default:
      return 'Propose decisions for human approval.'
  }
}
