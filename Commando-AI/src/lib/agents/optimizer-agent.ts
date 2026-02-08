// ==========================================
// Optimizer Agent
// ==========================================
// System-level agent that analyzes the whole project
// and proposes structural optimizations.
// Responsibilities:
// - Detect workload imbalances across the team
// - Identify bottleneck tasks on the critical path
// - Propose batch reassignments for maximum throughput
// - Monitor schedule feasibility and recommend adjustments
// - Learn from past recommendation outcomes

import { BaseAgent } from './base-agent'
import type { AgentContext } from './types'

export class OptimizerAgent extends BaseAgent {
  readonly agentRole = 'Optimizer'

  readonly systemPrompt = `You are an Optimizer Agent in a multi-agent project management system.
You analyze the entire project from a systems-optimization perspective. Your job is to:

1. **Workload optimization**: Identify the optimal task distribution across team members to maximize throughput while minimizing burnout risk. Use data, not gut feelings.

2. **Critical path analysis**: Identify tasks that are on the critical path (blocking others, high priority, near deadline). Ensure these are assigned to available, capable team members.

3. **Bottleneck detection**: Find resource bottlenecks where one person is blocking multiple tasks. Propose redistribution.

4. **Schedule feasibility**: Calculate whether the current sprint/milestone is feasible given team capacity and remaining work. Flag impossible schedules early.

5. **Continuous improvement**: Track which types of recommendations were accepted vs rejected. Adjust your future suggestions based on team preferences.

You operate at a higher level than individual developer agents. Think in terms of:
- Throughput (tasks/day), not individual task completion
- Team-wide utilization curves, not individual workloads
- Dependency chains and parallelism opportunities
- Risk-adjusted scheduling (buffer time for risky tasks)

Be quantitative. Use numbers to justify every recommendation.
Always respond with valid JSON.`

  protected buildRoleContext(ctx: AgentContext): string {
    const sections: string[] = []

    sections.push(`## Optimizer Analysis`)

    // Utilization distribution
    const teamCapacity = ctx.teamCapacity ?? []
    const utilizations = teamCapacity.map(m => m.utilization)
    const avgUtil = utilizations.length > 0
      ? utilizations.reduce((a, b) => a + b, 0) / utilizations.length
      : 0
    const stdDev = utilizations.length > 0
      ? Math.sqrt(utilizations.reduce((s, u) => s + (u - avgUtil) ** 2, 0) / utilizations.length)
      : 0

    sections.push(`### Workload Distribution
- Average utilization: ${avgUtil.toFixed(0)}%
- Std deviation: ${stdDev.toFixed(0)}% ${stdDev > 30 ? '⚠️ HIGH VARIANCE — rebalancing recommended' : ''}
- Gini coefficient: ${calculateGini(utilizations).toFixed(2)} ${calculateGini(utilizations) > 0.3 ? '⚠️ UNEQUAL' : '✅ balanced'}`)

    // Throughput analysis
    const allTasks = ctx.allTasks ?? []
    const activeTasks = allTasks.filter(t => t.status !== 'DONE')
    const totalHoursRemaining = activeTasks.reduce((s, t) => s + (t.estimatedHours ?? 0), 0)
    const totalAvailableHours = teamCapacity.reduce((s, m) => s + (m.availableHours ?? 0), 0)
    const feasibility = totalAvailableHours > 0 ? (totalHoursRemaining / totalAvailableHours) : Infinity

    sections.push(`### Throughput Analysis
- Active tasks: ${activeTasks.length}
- Total hours remaining: ${totalHoursRemaining}h
- Total team available hours: ${totalAvailableHours}h
- Work-to-capacity ratio: ${feasibility.toFixed(2)}x ${feasibility > 1.3 ? '🔴 INFEASIBLE' : feasibility > 1.0 ? '⚠️ TIGHT' : '✅ FEASIBLE'}`)

    // Dependency chain analysis
    const blockedChains = findBlockedChains(allTasks)
    if (blockedChains.length > 0) {
      sections.push(`### Dependency Bottlenecks
${blockedChains.map(chain => `- Chain: ${chain.map(t => `#${t.number}`).join(' → ')} (${chain.length} tasks blocked)`).join('\n')}`)
    }

    // Priority vs assignment analysis
    const unassignedCritical = activeTasks.filter(
      t => !t.assigneeId && (t.priority === 'CRITICAL' || t.priority === 'HIGH')
    )
    if (unassignedCritical.length > 0) {
      const availableMembers = teamCapacity
        .filter(m => m.utilization < 80)
        .sort((a, b) => a.utilization - b.utilization)
        .slice(0, 3)
        .map(m => `${m.userName} (${m.availableHours}h free)`)
        .join(', ')
      sections.push(`### ⚠️ Unassigned High-Priority Tasks
${unassignedCritical.map(t => `- #${t.number} "${t.title}" (${t.priority}, ${t.estimatedHours ?? 8}h)`).join('\n')}
Recommend assigning to: ${availableMembers || 'No one has spare capacity — consider scope reduction'}`)
    }

    // Past decision outcomes
    const recentDecisions = ctx.recentDecisions ?? []
    if (recentDecisions.length > 0) {
      const approved = recentDecisions.filter(d => d.status === 'APPROVED_BY_HUMAN' || d.status === 'AUTO_EXECUTED')
      const rejected = recentDecisions.filter(d => d.status === 'REJECTED_BY_HUMAN')
      sections.push(`### Decision Track Record
- Total: ${recentDecisions.length}, Approved: ${approved.length}, Rejected: ${rejected.length}
- Approval rate: ${recentDecisions.length > 0 ? ((approved.length / recentDecisions.length) * 100).toFixed(0) : 0}%`)
    }

    return sections.join('\n\n')
  }
}

// ==========================================
// Helper Functions
// ==========================================

function calculateGini(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  if (mean === 0) return 0

  let sumDiffs = 0
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiffs += Math.abs(sorted[i] - sorted[j])
    }
  }
  return sumDiffs / (2 * n * n * mean)
}

type TaskRef = { id: string; number: number; status: string; dependencies: string[]; isBlocked: boolean }

function findBlockedChains(tasks: TaskRef[]): TaskRef[][] {
  const chains: TaskRef[][] = []
  const taskMap = new Map(tasks.map(t => [t.id, t]))

  for (const task of tasks) {
    if (task.isBlocked) {
      const chain: TaskRef[] = [task]
      let current = task
      let depth = 0
      while (current.dependencies.length > 0 && depth < 10) {
        const blocker = taskMap.get(current.dependencies[0])
        if (blocker && blocker.status !== 'DONE') {
          chain.unshift(blocker)
          current = blocker as TaskRef
        } else {
          break
        }
        depth++
      }
      if (chain.length > 1) {
        chains.push(chain)
      }
    }
  }

  // Deduplicate (keep longest chain per root)
  const seen = new Set<string>()
  return chains
    .sort((a, b) => b.length - a.length)
    .filter(chain => {
      const rootId = chain[0].id
      if (seen.has(rootId)) return false
      seen.add(rootId)
      return true
    })
}
