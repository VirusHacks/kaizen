// ==========================================
// Manager Agent
// ==========================================
// Oversees the entire project from a PM perspective.
// Responsibilities:
// - Monitor delivery confidence and intervene
// - Coordinate between developer agents
// - Trigger sprint replanning when needed
// - Approve or escalate agent negotiation outcomes
// - Track team health and prevent burnout

import { BaseAgent } from './base-agent'
import type { AgentContext } from './types'

export class ManagerAgent extends BaseAgent {
  readonly agentRole = 'Manager'

  readonly systemPrompt = `You are a Manager Agent in a multi-agent project management system.
You oversee the entire project and coordinate between developer agents. Your job is to:

1. **Delivery oversight**: Monitor overall delivery confidence. When it drops below 70%, initiate intervention — propose replanning, task reassignment, or scope adjustment.

2. **Team coordination**: When developer agents raise HELP_REQUESTs, match them with available teammates. Facilitate task swaps that improve team flow.

3. **Burnout prevention**: Watch for team members with sustained high utilization. Propose workload rebalancing before burnout occurs.

4. **Risk management**: Identify cascading risks (blocked chains, overdue critical-path tasks) and propose mitigation actions.

5. **Sprint health**: Monitor sprint completion rate. If the sprint is at risk, propose scope changes or deadline extensions.

6. **Conflict resolution**: When developer agents disagree on task swaps or priorities, mediate and propose compromises.

You have a wider view than individual developer agents. Use it to make team-level optimizations.
Prefer gentle interventions (suggestions to agents) before escalating to formal decisions.
Always respond with valid JSON.`

  protected buildRoleContext(ctx: AgentContext): string {
    const sections: string[] = []

    sections.push(`## Manager-Specific Analysis`)

    // Delivery confidence assessment
    const deliveryConfidence = ctx.deliveryConfidence ?? 100
    if (deliveryConfidence < 50) {
      sections.push(`🚨 CRITICAL: Delivery confidence is ${deliveryConfidence}%. Immediate intervention required. Consider sprint replanning or scope reduction.`)
    } else if (deliveryConfidence < 70) {
      sections.push(`⚠️ WARNING: Delivery confidence is ${deliveryConfidence}%. Monitor closely and consider proactive rebalancing.`)
    } else {
      sections.push(`✅ Delivery confidence: ${deliveryConfidence}%`)
    }

    // Team health overview
    const teamCapacity = ctx.teamCapacity ?? []
    const overloaded = teamCapacity.filter(m => m.utilization > 100)
    const underloaded = teamCapacity.filter(m => m.utilization < 50 && m.taskCount < 2)
    const highBurnout = teamCapacity.filter(m => m.burnoutRisk > 60)

    if (overloaded.length > 0) {
      sections.push(`🔴 Overloaded members (${overloaded.length}): ${overloaded.map(m => `${m.userName} at ${m.utilization}%`).join(', ')}`)
    }
    if (underloaded.length > 0) {
      sections.push(`🟢 Available capacity: ${underloaded.map(m => `${m.userName} (${m.availableHours}h free)`).join(', ')}`)
    }
    if (highBurnout.length > 0) {
      sections.push(`🔥 Burnout risk: ${highBurnout.map(m => `${m.userName} at ${m.burnoutRisk}%`).join(', ')}`)
    }

    // Sprint progress
    if (ctx.activeSprint) {
      const paceNeeded = ctx.activeSprint.daysRemaining && ctx.activeSprint.daysRemaining > 0
        ? ((ctx.activeSprint.totalTasks - ctx.activeSprint.doneTasks) / ctx.activeSprint.daysRemaining).toFixed(1)
        : 'N/A'
      sections.push(`## Sprint Progress
- ${ctx.activeSprint.completionPercent}% complete (${ctx.activeSprint.doneTasks}/${ctx.activeSprint.totalTasks})
- ${ctx.activeSprint.daysRemaining} days remaining
- Need ${paceNeeded} tasks/day to finish on time`)
    }

    // Critical risks
    const criticalRisks = (ctx.risks ?? []).filter(r => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH')
    if (criticalRisks.length > 0) {
      sections.push(`## Critical Risks (${criticalRisks.length})
${criticalRisks.map(r => `- ${r.riskLevel}: "${r.taskTitle}" — ${(r.reasons ?? []).join(', ')}`).join('\n')}`)
    }

    // Unassigned tasks
    const unassigned = (ctx.allTasks ?? []).filter(t => !t.assigneeId && t.status !== 'DONE')
    if (unassigned.length > 0) {
      sections.push(`📋 ${unassigned.length} unassigned tasks: ${unassigned.slice(0, 5).map(t => `#${t.number} "${t.title}" (${t.priority})`).join(', ')}`)
    }

    // Optimization opportunities
    if (overloaded.length > 0 && underloaded.length > 0) {
      sections.push(`💡 REBALANCING OPPORTUNITY: ${overloaded.length} overloaded + ${underloaded.length} underloaded members. Consider proposing workload rebalancing.`)
    }

    return sections.join('\n')
  }
}
