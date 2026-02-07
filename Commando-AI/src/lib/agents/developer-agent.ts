// ==========================================
// Developer Agent
// ==========================================
// Represents an individual developer on the team.
// Responsibilities:
// - Monitor own workload and flag overload
// - Identify blockers and ask for help
// - Offer help to teammates when idle
// - Negotiate task swaps that improve team flow
// - Escalate overdue items

import { BaseAgent } from './base-agent'
import type { AgentContext } from './types'

export class DeveloperAgent extends BaseAgent {
  readonly agentRole = 'Developer'

  readonly systemPrompt = `You are a Developer Agent in a multi-agent project management system.
You represent a specific software developer on the team. Your job is to:

1. **Protect your developer's wellbeing**: Flag when workload is unsustainable, propose deadline extensions or task redistribution to prevent burnout.

2. **Remove blockers proactively**: If your tasks are blocked, reach out to the blocking party's agent to negotiate unblocking. Suggest workarounds.

3. **Optimize flow**: When you have spare capacity, offer to help overloaded teammates by taking on tasks that match your skills.

4. **Negotiate fairly**: When another agent proposes a task swap, evaluate it honestly. Accept if it's a net positive, counter-propose if partially agreeable, reject if harmful.

5. **Status transparency**: Keep your status updated so the Manager agent has accurate information.

You communicate with other agents via structured messages. You can:
- Send STATUS_UPDATE to broadcast your current state
- Send HELP_REQUEST when blocked or overloaded 
- Send TASK_OFFER when you have spare capacity
- Send NEGOTIATION_PROPOSAL to propose task swaps
- Propose TASK_REASSIGNMENT or DEADLINE_EXTENSION decisions

Be pragmatic and team-oriented. Protect your developer but also care about project success.
Always respond with valid JSON.`

  protected buildRoleContext(ctx: AgentContext): string {
    const teamCapacity = ctx.teamCapacity ?? []
    const myTasks = ctx.myTasks ?? []
    
    const myUtil = teamCapacity.find(m => m.userId === ctx.userId)
    const overdueTasks = myTasks.filter(t => t.isOverdue)
    const blockedTasks = myTasks.filter(t => t.isBlocked)
    const highPriTasks = myTasks.filter(t => t.priority === 'HIGH' || t.priority === 'CRITICAL')

    const sections: string[] = []

    sections.push(`## Developer-Specific Analysis`)

    if (myUtil) {
      if (myUtil.utilization > 100) {
        sections.push(`⚠️ YOU ARE OVERLOADED at ${myUtil.utilization}% utilization. Consider requesting help or proposing task reassignment.`)
      } else if (myUtil.utilization < 50 && myTasks.length < 3) {
        sections.push(`💡 You have spare capacity (${myUtil.availableHours}h free). Look for teammates who need help.`)
      }
      if (myUtil.burnoutRisk > 60) {
        sections.push(`🔴 Burnout risk is ${myUtil.burnoutRisk}%. Prioritize reducing workload.`)
      }
    }

    if (overdueTasks.length > 0) {
      sections.push(`🚨 ${overdueTasks.length} OVERDUE tasks: ${overdueTasks.map(t => `#${t.number}`).join(', ')}. This needs immediate attention — propose deadline extension or request help.`)
    }

    if (blockedTasks.length > 0) {
      sections.push(`🔒 ${blockedTasks.length} BLOCKED tasks: ${blockedTasks.map(t => `#${t.number}`).join(', ')}. Send a message to unblock these.`)
    }

    if (highPriTasks.length > 0) {
      sections.push(`🔥 ${highPriTasks.length} HIGH/CRITICAL tasks need focus: ${highPriTasks.map(t => `#${t.number} "${t.title}"`).join(', ')}`)
    }

    // Identify overloaded teammates who might need help
    const overloadedTeammates = teamCapacity.filter(
      m => m.userId !== ctx.userId && m.utilization > 110
    )
    if (overloadedTeammates.length > 0 && myUtil && myUtil.utilization < 80) {
      sections.push(`🤝 Teammates who might need help: ${overloadedTeammates.map(m => `${m.userName} (${m.utilization}% utilized)`).join(', ')}`)
    }

    return sections.join('\n')
  }
}
