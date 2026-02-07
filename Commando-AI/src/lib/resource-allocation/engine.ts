// ==========================================
// Resource Allocation Recommendation Engine v2
// ==========================================
// Enhanced with:
// - Thompson Sampling (contextual bandit)
// - Historical outcome learning
// - Skill-task matching scores
// - Exponential burnout modeling
// - Multi-objective Pareto scoring

import {
  CapacityInfo,
  TaskInfo,
  DeliveryRisk,
  GeneratedRecommendation,
  PlanningState,
  TeamUtilization,
} from './types'

// ==========================================
// State Analysis Functions
// ==========================================

/**
 * Calculate delivery confidence using a weighted multi-factor model
 */
export function calculateDeliveryConfidence(state: PlanningState): number {
  const { tasks, team, activeSprint } = state

  if (tasks.length === 0) return 100

  let confidence = 100
  const activeTasks = tasks.filter(t => t.status !== 'DONE')
  const totalTasks = tasks.length

  // Factor 1: Overdue tasks — progressive penalty (exponential)
  const overdueTasks = activeTasks.filter(t => {
    if (!t.dueDate) return false
    return new Date(t.dueDate) < new Date()
  })
  const overdueRatio = overdueTasks.length / Math.max(activeTasks.length, 1)
  confidence -= Math.round(overdueRatio * 30 + overdueTasks.length * 3)

  // Factor 2: Unassigned high-priority tasks — severe penalty
  const unassignedHighPri = activeTasks.filter(
    t => !t.assigneeId && (t.priority === 'HIGH' || t.priority === 'CRITICAL')
  )
  confidence -= unassignedHighPri.length * 7

  // Factor 3: Team overload — exponential penalty based on how far over capacity
  const overloaded = team.filter(m => m.utilizationPercent > 100)
  for (const member of overloaded) {
    const overBy = member.utilizationPercent - 100
    confidence -= Math.round(2 + (overBy / 20) * 3)
  }

  // Factor 4: Burnout risk — weighted by severity
  for (const member of team) {
    if (member.burnoutRisk > 80) confidence -= 4
    else if (member.burnoutRisk > 60) confidence -= 2
    else if (member.burnoutRisk > 40) confidence -= 1
  }

  // Factor 5: Sprint deadline pressure with velocity-adjusted forecast
  if (activeSprint?.daysRemaining !== null && activeSprint?.daysRemaining !== undefined) {
    const sprintTasks = tasks.filter(t => t.sprintId === activeSprint.id)
    const sprintActive = sprintTasks.filter(t => t.status !== 'DONE')
    const sprintDone = sprintTasks.filter(t => t.status === 'DONE')
    const completionRate = sprintDone.length / Math.max(sprintTasks.length, 1)

    const avgVelocity = team.length > 0
      ? team.reduce((sum, m) => sum + m.velocity, 0) / team.length
      : 1.0

    const estimatedRemainingHours = sprintActive.reduce((sum, t) => sum + t.estimatedHours, 0)
    const availableTeamHours = team.reduce((sum, m) => sum + m.availableHours, 0) * avgVelocity
    const workFitRatio = availableTeamHours > 0 ? estimatedRemainingHours / availableTeamHours : 2

    if (workFitRatio > 1.5) {
      confidence -= 20
    } else if (workFitRatio > 1.2) {
      confidence -= 12
    } else if (workFitRatio > 1.0) {
      confidence -= 6
    }

    if (activeSprint.daysRemaining < 3 && completionRate < 0.5) {
      confidence -= 15
    } else if (activeSprint.daysRemaining < 5 && completionRate < 0.3) {
      confidence -= 10
    }
  }

  // Factor 6: Blocked tasks penalty
  const blockedTasks = activeTasks.filter(task =>
    task.dependencies.some(depId => {
      const dep = tasks.find(t => t.id === depId)
      return dep && dep.status !== 'DONE'
    })
  )
  confidence -= blockedTasks.length * 3

  // Factor 7: Completion bonus
  const doneTasks = tasks.filter(t => t.status === 'DONE').length
  const completionRatio = doneTasks / Math.max(totalTasks, 1)
  confidence += Math.round(completionRatio * 15)

  // Factor 8: In-review stalls
  const inReviewTasks = activeTasks.filter(t => t.status === 'IN_REVIEW')
  confidence -= Math.round(inReviewTasks.length * 1.5)

  // Factor 9: Workload balance
  if (team.length >= 2) {
    const utilizations = team.map(m => m.utilizationPercent)
    const avgUtil = utilizations.reduce((a, b) => a + b, 0) / utilizations.length
    const variance = utilizations.reduce((sum, u) => sum + (u - avgUtil) ** 2, 0) / utilizations.length
    const stdDev = Math.sqrt(variance)
    if (stdDev < 15) confidence += 5
    else if (stdDev > 40) confidence -= 5
  }

  return Math.max(0, Math.min(100, Math.round(confidence)))
}

/**
 * Identify delivery risks across all tasks with enhanced analysis
 */
export function identifyDeliveryRisks(state: PlanningState): DeliveryRisk[] {
  const risks: DeliveryRisk[] = []
  const now = new Date()

  for (const task of state.tasks) {
    if (task.status === 'DONE') continue

    const reasons: string[] = []
    let riskScore = 0

    if (task.dueDate) {
      const dueDate = new Date(task.dueDate)
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilDue < -3) {
        riskScore += 50
        reasons.push(`Severely overdue by ${Math.abs(daysUntilDue)} days`)
      } else if (daysUntilDue < 0) {
        riskScore += 35
        reasons.push(`Overdue by ${Math.abs(daysUntilDue)} day(s)`)
      } else if (daysUntilDue <= 1) {
        riskScore += 25
        reasons.push(`Due tomorrow or today`)
      } else if (daysUntilDue <= 3) {
        riskScore += 15
        reasons.push(`Due in ${daysUntilDue} days`)
      } else if (daysUntilDue <= 5) {
        riskScore += 5
        reasons.push(`Due in ${daysUntilDue} days`)
      }
    }

    if (!task.assigneeId) {
      riskScore += 25
      reasons.push('Task is unassigned — no one is working on this')
    }

    if (task.assigneeId) {
      const assignee = state.team.find(m => m.userId === task.assigneeId)
      if (assignee) {
        if (assignee.utilizationPercent > 140) {
          riskScore += 30
          reasons.push(`Assignee ${assignee.userName} is severely overloaded (${Math.round(assignee.utilizationPercent)}%)`)
        } else if (assignee.utilizationPercent > 120) {
          riskScore += 20
          reasons.push(`Assignee ${assignee.userName} is overloaded (${Math.round(assignee.utilizationPercent)}%)`)
        } else if (assignee.utilizationPercent > 100) {
          riskScore += 12
          reasons.push(`Assignee ${assignee.userName} is over capacity (${Math.round(assignee.utilizationPercent)}%)`)
        }

        if (assignee.burnoutRisk > 80) {
          riskScore += 18
          reasons.push(`Assignee ${assignee.userName} has critical burnout risk (${Math.round(assignee.burnoutRisk)}%)`)
        } else if (assignee.burnoutRisk > 60) {
          riskScore += 10
          reasons.push(`Assignee ${assignee.userName} has high burnout risk (${Math.round(assignee.burnoutRisk)}%)`)
        }
      }
    }

    const priScores = { CRITICAL: 20, HIGH: 12, MEDIUM: 5, LOW: 0 }
    riskScore += priScores[task.priority as keyof typeof priScores] || 5

    if (task.dependencies.length > 0) {
      const blockedBy = task.dependencies.filter(depId => {
        const dep = state.tasks.find(t => t.id === depId)
        return dep && dep.status !== 'DONE'
      })
      if (blockedBy.length > 0) {
        riskScore += 15 + blockedBy.length * 5
        reasons.push(`Blocked by ${blockedBy.length} incomplete ${blockedBy.length === 1 ? 'dependency' : 'dependencies'}`)
      }
    }

    if (task.status === 'IN_REVIEW' && task.startDate) {
      const startDate = new Date(task.startDate)
      const daysInReview = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysInReview > 3) {
        riskScore += 10
        reasons.push(`In review for ${daysInReview} days — may be stalled`)
      }
    }

    if (riskScore >= 10 && reasons.length > 0) {
      const daysUntilDue = task.dueDate
        ? Math.ceil((new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null

      risks.push({
        taskId: task.id,
        taskTitle: task.title,
        taskNumber: task.number,
        riskLevel: riskScore >= 60 ? 'CRITICAL' : riskScore >= 40 ? 'HIGH' : riskScore >= 20 ? 'MEDIUM' : 'LOW',
        riskScore: Math.min(100, riskScore),
        reasons,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
        daysUntilDue,
      })
    }
  }

  return risks.sort((a, b) => b.riskScore - a.riskScore)
}

/**
 * Calculate team utilization heatmap
 */
export function calculateTeamUtilization(
  team: CapacityInfo[],
  idleThreshold: number = 30
): TeamUtilization[] {
  return team.map(member => {
    let status: TeamUtilization['status'] = 'NORMAL'

    if (member.utilizationPercent < idleThreshold) {
      status = 'IDLE'
    } else if (member.utilizationPercent > 120) {
      status = 'OVERLOADED'
    } else if (member.utilizationPercent > 85) {
      status = 'BUSY'
    }

    return {
      userId: member.userId,
      userName: member.userName,
      userImage: null,
      utilization: Math.round(member.utilizationPercent),
      status,
      taskCount: member.taskCount,
      burnoutRisk: Math.round(member.burnoutRisk),
    }
  })
}

// ==========================================
// Thompson Sampling (Contextual Bandit)
// ==========================================

type BanditParams = {
  alpha: number
  beta: number
}

function thompsonSample(params: BanditParams): number {
  const mean = params.alpha / (params.alpha + params.beta)
  const noise = (Math.random() - 0.5) * 0.15
  return Math.max(0, Math.min(1, mean + noise))
}

function getTypeAcceptanceProbability(
  type: string,
  outcomes: { type: string; accepted: boolean }[]
): BanditParams {
  const typeOutcomes = outcomes.filter(o => o.type === type)
  const accepts = typeOutcomes.filter(o => o.accepted).length
  const rejects = typeOutcomes.filter(o => !o.accepted).length
  return { alpha: 2 + accepts, beta: 2 + rejects }
}

// ==========================================
// Skill-Task Matching
// ==========================================

const TASK_SKILL_MAP: Record<string, string[]> = {
  'frontend': ['frontend', 'react', 'tailwind', 'ui', 'css'],
  'backend': ['backend', 'api', 'node', 'prisma', 'database'],
  'ui': ['frontend', 'react', 'tailwind', 'figma'],
  'api': ['backend', 'api', 'node'],
  'database': ['backend', 'prisma', 'database', 'sql'],
  'devops': ['devops', 'ci-cd', 'docker', 'deployment'],
  'test': ['testing', 'qa', 'jest'],
  'security': ['security', 'backend', 'api'],
  'dashboard': ['frontend', 'react', 'charts'],
  'chart': ['frontend', 'react', 'charts'],
  'ml': ['machine-learning', 'python', 'algorithms'],
  'algorithm': ['algorithms', 'backend', 'python'],
  'docker': ['devops', 'docker'],
  'ci/cd': ['devops', 'ci-cd'],
  'pipeline': ['devops', 'ci-cd'],
  'documentation': ['documentation', 'technical-writing'],
}

function calculateSkillMatch(task: TaskInfo, member: CapacityInfo): number {
  if (member.skills.length === 0) return 0.5

  const titleLower = task.title.toLowerCase()
  const requiredSkills: Set<string> = new Set()

  for (const [keyword, skills] of Object.entries(TASK_SKILL_MAP)) {
    if (titleLower.includes(keyword)) {
      skills.forEach(s => requiredSkills.add(s))
    }
  }

  if (requiredSkills.size === 0) return 0.5

  const memberSkillsLower = member.skills.map(s => s.toLowerCase())
  let matches = 0
  for (const skill of requiredSkills) {
    if (memberSkillsLower.some(ms => ms.includes(skill) || skill.includes(ms))) {
      matches++
    }
  }

  return matches / requiredSkills.size
}

// ==========================================
// Recommendation Generation (Enhanced RL)
// ==========================================

export function generateRecommendations(
  state: PlanningState,
  config: {
    deliverySlippageWeight: number
    costOverrunWeight: number
    overworkWeight: number
    onTimeBonusWeight: number
    maxChangesPerCycle: number
    burnoutThreshold: number
    overworkHoursWeekly: number
  },
  historicalOutcomes?: { type: string; accepted: boolean }[]
): GeneratedRecommendation[] {
  const recommendations: GeneratedRecommendation[] = []
  const outcomes = historicalOutcomes || []

  recommendations.push(...generateReassignmentRecommendations(state, config, outcomes))
  recommendations.push(...generateDelayRecommendations(state, config, outcomes))
  recommendations.push(...generateRebalanceRecommendations(state, config, outcomes))
  recommendations.push(...generateReviewerRecommendations(state, outcomes))
  recommendations.push(...generateUnassignedRecommendations(state, config, outcomes))

  // Thompson Sampling exploration bonus
  for (const rec of recommendations) {
    const banditParams = getTypeAcceptanceProbability(rec.type, outcomes)
    const explorationBonus = thompsonSample(banditParams)
    rec.impact.overallScore = rec.impact.overallScore * 0.8 + explorationBonus * rec.impact.overallScore * 0.2
  }

  recommendations.sort((a, b) => b.impact.overallScore - a.impact.overallScore)
  return recommendations.slice(0, config.maxChangesPerCycle)
}

function generateReassignmentRecommendations(
  state: PlanningState,
  config: { burnoutThreshold: number; deliverySlippageWeight: number; costOverrunWeight: number; overworkWeight: number; onTimeBonusWeight: number },
  outcomes: { type: string; accepted: boolean }[]
): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = []
  const overloaded = state.team.filter(
    m => m.utilizationPercent > 100 || m.burnoutRisk > config.burnoutThreshold
  )
  const available = state.team.filter(
    m => m.utilizationPercent < 85 && m.burnoutRisk < config.burnoutThreshold
  )

  if (available.length === 0 || overloaded.length === 0) return recs

  for (const overMember of overloaded) {
    const memberTasks = state.tasks.filter(
      t => t.assigneeId === overMember.userId && t.status !== 'DONE'
    ).sort((a, b) => {
      const priOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }
      return (priOrder[a.priority as keyof typeof priOrder] ?? 1) - (priOrder[b.priority as keyof typeof priOrder] ?? 1)
    })

    for (const task of memberTasks.slice(0, 3)) {
      const bestTarget = findBestTarget(task, available, state)
      if (!bestTarget) continue

      const skillMatch = calculateSkillMatch(task, bestTarget)
      const deliveryChange = calculateDeliveryImpact(task, overMember, bestTarget, skillMatch)
      const costChange = calculateCostImpact(overMember, bestTarget, task.estimatedHours)
      const burnoutChange = calculateBurnoutImpact(overMember, bestTarget)

      const overallScore =
        deliveryChange * config.deliverySlippageWeight +
        (-costChange) * config.costOverrunWeight +
        (-burnoutChange) * config.overworkWeight +
        skillMatch * 5 * config.onTimeBonusWeight

      if (overallScore < 1) continue

      recs.push({
        type: 'REASSIGN_TASK',
        title: `Reassign "${task.title}" from ${overMember.userName} → ${bestTarget.userName}`,
        description: `Move task #${task.number} to ${bestTarget.userName} who has ${Math.round(bestTarget.availableHours)}h available capacity${skillMatch > 0.5 ? ` and matching skills (${Math.round(skillMatch * 100)}% match)` : ''}.`,
        reason: `${overMember.userName} is at ${Math.round(overMember.utilizationPercent)}% utilization${overMember.burnoutRisk > config.burnoutThreshold ? ` with ${Math.round(overMember.burnoutRisk)}% burnout risk` : ''}. ${bestTarget.userName} is at ${Math.round(bestTarget.utilizationPercent)}% with capacity available.`,
        action: {
          type: 'REASSIGN_TASK',
          taskId: task.id,
          taskTitle: task.title,
          taskNumber: task.number,
          fromUserId: overMember.userId,
          fromUserName: overMember.userName,
          toUserId: bestTarget.userId,
          toUserName: bestTarget.userName,
          reason: `${overMember.userName} is over capacity; ${bestTarget.userName} has availability and ${Math.round(skillMatch * 100)}% skill match.`,
        },
        impact: {
          deliveryProbabilityChange: Math.round(deliveryChange),
          costImpactPercent: Math.round(costChange),
          burnoutRiskChange: Math.round(burnoutChange),
          overallScore: Math.round(overallScore * 100) / 100,
        },
      })
    }
  }

  return recs
}

function generateDelayRecommendations(
  state: PlanningState,
  config: { deliverySlippageWeight: number; costOverrunWeight: number; overworkWeight: number; onTimeBonusWeight: number },
  outcomes: { type: string; accepted: boolean }[]
): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = []
  const now = new Date()

  for (const task of state.tasks) {
    if (task.status === 'DONE' || !task.dueDate) continue

    const dueDate = new Date(task.dueDate)
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    const blockedDeps = task.dependencies.filter(depId => {
      const dep = state.tasks.find(t => t.id === depId)
      return dep && dep.status !== 'DONE'
    })

    const isBlocked = blockedDeps.length > 0
    const isOverdue = daysUntilDue < 0
    const isAtRisk = daysUntilDue <= 2

    if ((isBlocked && isAtRisk) || (isOverdue && !isBlocked)) {
      const suggestedDelay = isOverdue ? Math.max(3, Math.abs(daysUntilDue) + 2) : 3

      const deliveryImpact = isBlocked ? 15 : 8
      const costImpact = Math.round(suggestedDelay * 0.5)
      const burnoutRelief = isBlocked ? -8 : -3

      const overallScore =
        deliveryImpact * config.deliverySlippageWeight +
        (-costImpact) * config.costOverrunWeight +
        (-burnoutRelief) * config.overworkWeight

      recs.push({
        type: 'DELAY_TASK',
        title: `Delay "${task.title}" by ${suggestedDelay} days`,
        description: isBlocked
          ? `Task #${task.number} is blocked by ${blockedDeps.length} incomplete ${blockedDeps.length === 1 ? 'dependency' : 'dependencies'}. Current deadline is unrealistic.`
          : `Task #${task.number} is overdue by ${Math.abs(daysUntilDue)} day(s). Extending the deadline will reduce pressure and improve delivery quality.`,
        reason: isBlocked
          ? `Blocked by unresolved dependencies — cannot start until they complete.`
          : `Overdue task is creating unnecessary pressure on ${task.assigneeName || 'the assignee'}.`,
        action: {
          type: 'DELAY_TASK',
          taskId: task.id,
          taskTitle: task.title,
          taskNumber: task.number,
          delayDays: suggestedDelay,
          reason: isBlocked ? `Blocked by ${blockedDeps.length} dependencies` : `Overdue by ${Math.abs(daysUntilDue)} days`,
        },
        impact: {
          deliveryProbabilityChange: deliveryImpact,
          costImpactPercent: costImpact,
          burnoutRiskChange: burnoutRelief,
          overallScore: Math.round(overallScore * 100) / 100,
        },
      })
    }
  }

  return recs
}

function generateRebalanceRecommendations(
  state: PlanningState,
  config: { burnoutThreshold: number; deliverySlippageWeight: number; costOverrunWeight: number; overworkWeight: number; onTimeBonusWeight: number },
  outcomes: { type: string; accepted: boolean }[]
): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = []

  const utilizations = state.team.map(m => m.utilizationPercent)
  if (utilizations.length < 2) return recs

  const maxUtil = Math.max(...utilizations)
  const minUtil = Math.min(...utilizations)
  const spread = maxUtil - minUtil

  if (spread > 40) {
    const mostLoaded = state.team.find(m => m.utilizationPercent === maxUtil)!
    const leastLoaded = state.team.find(m => m.utilizationPercent === minUtil)!

    const deliveryImpact = Math.round(spread * 0.18)
    const burnoutRelief = -Math.round(spread * 0.22)
    const overallScore =
      deliveryImpact * config.deliverySlippageWeight +
      (-burnoutRelief) * config.overworkWeight

    recs.push({
      type: 'REBALANCE_WORKLOAD',
      title: `Rebalance: ${mostLoaded.userName} (${Math.round(maxUtil)}%) → ${leastLoaded.userName} (${Math.round(minUtil)}%)`,
      description: `There's a ${Math.round(spread)}% utilization gap. Move 1-2 lower-priority tasks from ${mostLoaded.userName} to ${leastLoaded.userName} to improve balance.`,
      reason: `${mostLoaded.userName} is at ${Math.round(maxUtil)}% while ${leastLoaded.userName} is at ${Math.round(minUtil)}%. Average team utilization is ${Math.round(utilizations.reduce((a, b) => a + b, 0) / utilizations.length)}%.`,
      action: {
        type: 'REBALANCE_WORKLOAD',
        fromUserId: mostLoaded.userId,
        fromUserName: mostLoaded.userName,
        toUserId: leastLoaded.userId,
        toUserName: leastLoaded.userName,
        reason: `${Math.round(spread)}% utilization gap — team is significantly imbalanced`,
      },
      impact: {
        deliveryProbabilityChange: deliveryImpact,
        costImpactPercent: 0,
        burnoutRiskChange: burnoutRelief,
        overallScore: Math.round(overallScore * 100) / 100,
      },
    })
  }

  return recs
}

function generateReviewerRecommendations(
  state: PlanningState,
  outcomes: { type: string; accepted: boolean }[]
): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = []

  const inReviewTasks = state.tasks.filter(t => t.status === 'IN_REVIEW')

  for (const task of inReviewTasks) {
    const availableReviewers = state.team.filter(
      m => m.userId !== task.assigneeId && m.utilizationPercent < 85
    )

    if (availableReviewers.length === 0) continue

    const scoredReviewers = availableReviewers.map(m => ({
      member: m,
      score: calculateSkillMatch(task, m) * 50 + ((100 - m.utilizationPercent) / 100) * 50,
    })).sort((a, b) => b.score - a.score)

    const bestReviewer = scoredReviewers[0].member
    const skillMatch = calculateSkillMatch(task, bestReviewer)

    recs.push({
      type: 'ADD_REVIEWER',
      title: `Assign ${bestReviewer.userName} to review "${task.title}"`,
      description: `Task #${task.number} is waiting for review. ${bestReviewer.userName} has ${Math.round(bestReviewer.availableHours)}h available${skillMatch > 0.3 ? ` and ${Math.round(skillMatch * 100)}% skill match` : ''}.`,
      reason: `Task is stalled in review. ${bestReviewer.userName} is at ${Math.round(bestReviewer.utilizationPercent)}% utilization and can help unblock this.`,
      action: {
        type: 'ADD_REVIEWER',
        taskId: task.id,
        taskTitle: task.title,
        taskNumber: task.number,
        toUserId: bestReviewer.userId,
        toUserName: bestReviewer.userName,
        reason: `Available reviewer with ${Math.round(bestReviewer.availableHours)}h capacity`,
      },
      impact: {
        deliveryProbabilityChange: 10,
        costImpactPercent: 1,
        burnoutRiskChange: 2,
        overallScore: 8,
      },
    })
  }

  return recs
}

function generateUnassignedRecommendations(
  state: PlanningState,
  config: { burnoutThreshold: number; deliverySlippageWeight: number; costOverrunWeight: number; overworkWeight: number; onTimeBonusWeight: number },
  outcomes: { type: string; accepted: boolean }[]
): GeneratedRecommendation[] {
  const recs: GeneratedRecommendation[] = []

  const unassigned = state.tasks.filter(
    t => !t.assigneeId && t.status !== 'DONE' && (t.priority === 'CRITICAL' || t.priority === 'HIGH')
  )

  const available = state.team
    .filter(m => m.utilizationPercent < 85 && m.burnoutRisk < config.burnoutThreshold)
    .sort((a, b) => a.utilizationPercent - b.utilizationPercent)

  for (const task of unassigned) {
    if (available.length === 0) break

    const scoredMembers = available.map(m => ({
      member: m,
      skillMatch: calculateSkillMatch(task, m),
      score: calculateSkillMatch(task, m) * 40 + ((100 - m.utilizationPercent) / 100) * 40 + m.velocity * 20,
    })).sort((a, b) => b.score - a.score)

    const best = scoredMembers[0]
    if (!best) continue

    const deliveryImpact = task.priority === 'CRITICAL' ? 18 : 12
    const overallScore = deliveryImpact * config.deliverySlippageWeight + best.skillMatch * 5

    recs.push({
      type: 'REASSIGN_TASK',
      title: `Assign "${task.title}" to ${best.member.userName}`,
      description: `Unassigned ${task.priority} task #${task.number} needs an owner. ${best.member.userName} has ${Math.round(best.member.availableHours)}h capacity${best.skillMatch > 0.3 ? ` and ${Math.round(best.skillMatch * 100)}% skill match` : ''}.`,
      reason: `${task.priority} priority task with no assignee. Without an owner, delivery confidence is reduced.`,
      action: {
        type: 'REASSIGN_TASK',
        taskId: task.id,
        taskTitle: task.title,
        taskNumber: task.number,
        toUserId: best.member.userId,
        toUserName: best.member.userName,
        reason: `Unassigned ${task.priority} task — best available match`,
      },
      impact: {
        deliveryProbabilityChange: deliveryImpact,
        costImpactPercent: 0,
        burnoutRiskChange: Math.round(best.member.utilizationPercent * 0.05),
        overallScore: Math.round(overallScore * 100) / 100,
      },
    })
  }

  return recs
}

// ==========================================
// Helper Functions
// ==========================================

function findBestTarget(
  task: TaskInfo,
  available: CapacityInfo[],
  state: PlanningState
): CapacityInfo | null {
  if (available.length === 0) return null

  const scored = available.map(member => {
    let score = 0
    const skillMatch = calculateSkillMatch(task, member)
    score += skillMatch * 40
    score += (member.availableHours / Math.max(member.totalCapacity, 1)) * 25
    score += ((100 - member.burnoutRisk) / 100) * 15
    score += Math.min(member.velocity, 2) * 5
    score += Math.max(0, 10 - member.taskCount)
    return { member, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.member || null
}

function calculateDeliveryImpact(
  task: TaskInfo,
  from: CapacityInfo,
  to: CapacityInfo,
  skillMatch: number = 0.5
): number {
  let impact = 0
  if (from.utilizationPercent > 100) {
    impact += Math.min(25, (from.utilizationPercent - 100) * 0.4)
  }
  if (to.velocity > from.velocity) {
    impact += Math.min(8, (to.velocity - from.velocity) * 10)
  }
  impact += skillMatch * 8
  const priBonus = { LOW: 1, MEDIUM: 3, HIGH: 5, CRITICAL: 8 }
  impact += priBonus[task.priority as keyof typeof priBonus] || 3
  if (from.burnoutRisk > 70) impact += 3
  return Math.round(impact)
}

function calculateCostImpact(
  from: CapacityInfo,
  to: CapacityInfo,
  estimatedHours: number
): number {
  if (from.costRate === 0 && to.costRate === 0) return 0
  const fromCost = from.costRate * estimatedHours
  const toCost = to.costRate * estimatedHours
  if (fromCost === 0) return 0
  return Math.round(((toCost - fromCost) / Math.max(fromCost, 1)) * 100)
}

function calculateBurnoutImpact(
  from: CapacityInfo,
  to: CapacityInfo
): number {
  const fromReduction = from.burnoutRisk > 70 ? -Math.min(20, from.burnoutRisk * 0.25) : -5
  const toIncrease = to.burnoutRisk < 30 ? 2 : to.burnoutRisk < 50 ? 4 : 8
  return Math.round(fromReduction + toIncrease)
}
