import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seeds a project with rich realistic data for the Resource Planning & Allocation feature.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-resource-planning.ts
 */
async function main() {
  console.log('🌱 Seeding Resource Planning data...\n')

  // 1. Find the first user (project owner)
  const user = await prisma.user.findFirst()
  if (!user) {
    console.error('❌ No users found. Sign in first to create a user.')
    return
  }
  console.log(`✅ Found owner: ${user.name || user.email} (${user.clerkId})`)

  // 2. Find or create a project
  let project = await prisma.project.findFirst({
    where: { ownerId: user.clerkId },
  })

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: 'Kaizen Platform',
        key: 'KZN',
        description: 'AI-powered project management platform with resource allocation',
        ownerId: user.clerkId,
      },
    })
    console.log(`✅ Created project: ${project.name}`)
  } else {
    console.log(`✅ Using existing project: ${project.name} (${project.key})`)
  }

  const projectId = project.id

  // 3. Clean existing resource data for this project
  console.log('\n🧹 Cleaning existing resource planning data...')
  await prisma.resourceAuditLog.deleteMany({ where: { projectId } })
  await prisma.recommendation.deleteMany({ where: { snapshot: { projectId } } })
  await prisma.planningCycleSnapshot.deleteMany({ where: { projectId } })
  await prisma.resourceAllocation.deleteMany({ where: { projectId } })
  await prisma.resourceConfig.deleteMany({ where: { projectId } })

  // 4. Create team members (5 realistic developers)
  console.log('\n👥 Creating team members...')

  const teamMembers = [
    { name: 'Aarav Sharma', email: 'aarav@kaizen.dev', clerkId: 'user_aarav_001' },
    { name: 'Priya Patel', email: 'priya@kaizen.dev', clerkId: 'user_priya_002' },
    { name: 'Rahul Gupta', email: 'rahul@kaizen.dev', clerkId: 'user_rahul_003' },
    { name: 'Sneha Reddy', email: 'sneha@kaizen.dev', clerkId: 'user_sneha_004' },
    { name: 'Vikram Singh', email: 'vikram@kaizen.dev', clerkId: 'user_vikram_005' },
    { name: 'Ananya Joshi', email: 'ananya@kaizen.dev', clerkId: 'user_ananya_006' },
  ]

  for (const tm of teamMembers) {
    await prisma.user.upsert({
      where: { clerkId: tm.clerkId },
      update: { name: tm.name },
      create: {
        clerkId: tm.clerkId,
        name: tm.name,
        email: tm.email,
      },
    })

    await prisma.projectMember.upsert({
      where: {
        projectId_memberId: {
          projectId,
          memberId: tm.clerkId,
        },
      },
      update: {},
      create: {
        projectId,
        userId: tm.clerkId,
        memberId: tm.clerkId,
        role: 'MEMBER',
        departmentRole: 'DEVELOPER',
      },
    })
  }

  // Also add the owner as a member
  await prisma.projectMember.upsert({
    where: {
      projectId_memberId: {
        projectId,
        memberId: user.clerkId,
      },
    },
    update: {},
    create: {
      projectId,
      userId: user.clerkId,
      memberId: user.clerkId,
      role: 'OWNER',
      departmentRole: 'PROJECT_MANAGER',
    },
  })

  console.log(`✅ Created ${teamMembers.length} team members + owner`)

  // 5. Create an active sprint
  console.log('\n🏃 Creating sprint...')
  const now = new Date()
  const sprintEnd = new Date(now)
  sprintEnd.setDate(sprintEnd.getDate() + 5) // Sprint ends in 5 days
  const sprintStart = new Date(now)
  sprintStart.setDate(sprintStart.getDate() - 9) // Started 9 days ago (14-day sprint)

  // Delete existing sprints for this project to avoid conflicts
  await prisma.issue.updateMany({
    where: { projectId },
    data: { sprintId: null },
  })
  await prisma.sprint.deleteMany({ where: { projectId } })

  const sprint = await prisma.sprint.create({
    data: {
      name: 'Sprint 7 - Resource Allocation MVP',
      goal: 'Deliver core resource allocation features and AI recommendation engine',
      startDate: sprintStart,
      endDate: sprintEnd,
      status: 'ACTIVE',
      projectId,
    },
  })
  console.log(`✅ Created sprint: ${sprint.name} (ends in 5 days)`)

  // 6. Create realistic issues/tasks
  console.log('\n📋 Creating issues...')

  // Delete existing issues
  // First delete children (subtasks), then parents
  await prisma.issue.deleteMany({
    where: { projectId, parentId: { not: null } },
  })
  await prisma.issue.deleteMany({ where: { projectId } })

  // Reset issue counter
  await prisma.project.update({
    where: { id: projectId },
    data: { issueCounter: 0 },
  })

  const d = (daysFromNow: number) => {
    const date = new Date(now)
    date.setDate(date.getDate() + daysFromNow)
    return date
  }

  // Issues designed to trigger various recommendation types:
  // - Some overloaded assignees (Aarav has too many tasks)
  // - Some idle assignees (Ananya has no tasks)
  // - Some overdue tasks
  // - Some blocked tasks
  // - Some in review tasks
  // - Varied priorities
  const issues = [
    // === AARAV is OVERLOADED (7 tasks) ===
    { n: 1, title: 'Design RL reward function architecture', type: 'STORY', status: 'IN_PROGRESS', priority: 'CRITICAL', assigneeId: 'user_aarav_001', dueDate: d(2), sprintId: sprint.id },
    { n: 2, title: 'Implement contextual bandit algorithm', type: 'TASK', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'user_aarav_001', dueDate: d(3), sprintId: sprint.id },
    { n: 3, title: 'Build recommendation scoring engine', type: 'TASK', status: 'TODO', priority: 'HIGH', assigneeId: 'user_aarav_001', dueDate: d(4), sprintId: sprint.id },
    { n: 4, title: 'Implement burnout risk calculator', type: 'TASK', status: 'TODO', priority: 'MEDIUM', assigneeId: 'user_aarav_001', dueDate: d(1), sprintId: sprint.id },
    { n: 5, title: 'Write unit tests for engine', type: 'TASK', status: 'TODO', priority: 'MEDIUM', assigneeId: 'user_aarav_001', dueDate: d(5), sprintId: sprint.id },
    { n: 6, title: 'Create delivery confidence model', type: 'TASK', status: 'TODO', priority: 'HIGH', assigneeId: 'user_aarav_001', dueDate: d(3), sprintId: sprint.id },
    { n: 7, title: 'Performance optimization for engine', type: 'TASK', status: 'TODO', priority: 'LOW', assigneeId: 'user_aarav_001', dueDate: d(6), sprintId: sprint.id },

    // === PRIYA is BUSY (4 tasks, 1 overdue) ===
    { n: 8, title: 'Build PM dashboard overview tab', type: 'STORY', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'user_priya_002', dueDate: d(-1), sprintId: sprint.id }, // OVERDUE
    { n: 9, title: 'Implement utilization heatmap component', type: 'TASK', status: 'IN_REVIEW', priority: 'MEDIUM', assigneeId: 'user_priya_002', dueDate: d(2), sprintId: sprint.id },
    { n: 10, title: 'Create recommendation cards UI', type: 'TASK', status: 'IN_PROGRESS', priority: 'HIGH', assigneeId: 'user_priya_002', dueDate: d(3), sprintId: sprint.id },
    { n: 11, title: 'Add dark mode support for charts', type: 'TASK', status: 'TODO', priority: 'LOW', assigneeId: 'user_priya_002', dueDate: d(5), sprintId: sprint.id },

    // === RAHUL is NORMAL (3 tasks) ===
    { n: 12, title: 'Set up Prisma schema for resource models', type: 'TASK', status: 'DONE', priority: 'HIGH', assigneeId: 'user_rahul_003', dueDate: d(-3), sprintId: sprint.id },
    { n: 13, title: 'Build server actions for resource planning', type: 'TASK', status: 'DONE', priority: 'HIGH', assigneeId: 'user_rahul_003', dueDate: d(-1), sprintId: sprint.id },
    { n: 14, title: 'Implement audit log system', type: 'TASK', status: 'IN_PROGRESS', priority: 'MEDIUM', assigneeId: 'user_rahul_003', dueDate: d(4), sprintId: sprint.id },

    // === SNEHA has OVERDUE + HIGH PRIORITY items ===
    { n: 15, title: 'API integration for external workforce data', type: 'STORY', status: 'IN_PROGRESS', priority: 'CRITICAL', assigneeId: 'user_sneha_004', dueDate: d(-2), sprintId: sprint.id }, // OVERDUE
    { n: 16, title: 'Build finance dashboard view', type: 'TASK', status: 'TODO', priority: 'HIGH', assigneeId: 'user_sneha_004', dueDate: d(1), sprintId: sprint.id },
    { n: 17, title: 'Create executive summary view', type: 'TASK', status: 'TODO', priority: 'HIGH', assigneeId: 'user_sneha_004', dueDate: d(2), sprintId: sprint.id },
    { n: 18, title: 'Cost tracking dashboard widgets', type: 'TASK', status: 'TODO', priority: 'MEDIUM', assigneeId: 'user_sneha_004', dueDate: d(4), sprintId: sprint.id },
    { n: 19, title: 'Implement role-based access control', type: 'TASK', status: 'IN_REVIEW', priority: 'HIGH', assigneeId: 'user_sneha_004', dueDate: d(1), sprintId: sprint.id },

    // === VIKRAM is LIGHTLY LOADED (2 tasks, both done or easy) ===
    { n: 20, title: 'Set up CI/CD pipeline for staging', type: 'TASK', status: 'DONE', priority: 'MEDIUM', assigneeId: 'user_vikram_005', dueDate: d(-5), sprintId: sprint.id },
    { n: 21, title: 'Write documentation for API endpoints', type: 'TASK', status: 'IN_PROGRESS', priority: 'LOW', assigneeId: 'user_vikram_005', dueDate: d(10), sprintId: sprint.id },

    // === ANANYA has ZERO tasks (completely idle) ===
    // No tasks assigned

    // === UNASSIGNED tasks (risk indicators) ===
    { n: 22, title: 'Security audit for resource allocation endpoints', type: 'TASK', status: 'TODO', priority: 'CRITICAL', assigneeId: null, dueDate: d(3), sprintId: sprint.id },
    { n: 23, title: 'Load testing for planning cycle', type: 'TASK', status: 'TODO', priority: 'HIGH', assigneeId: null, dueDate: d(4), sprintId: sprint.id },

    // === BACKLOG items (no sprint) ===
    { n: 24, title: 'Implement Slack notification for recommendations', type: 'STORY', status: 'TODO', priority: 'MEDIUM', assigneeId: null, dueDate: null, sprintId: null },
    { n: 25, title: 'Add historical trend comparison view', type: 'TASK', status: 'TODO', priority: 'LOW', assigneeId: null, dueDate: null, sprintId: null },
  ]

  // Create a parent epic first for dependency testing
  const epic = await prisma.issue.create({
    data: {
      number: 0,
      title: 'Resource Allocation System - Epic',
      type: 'EPIC',
      status: 'IN_PROGRESS',
      priority: 'CRITICAL',
      projectId,
      reporterId: user.clerkId,
      assigneeId: user.clerkId,
      sprintId: sprint.id,
      dueDate: sprintEnd,
    },
  })

  // Create all issues
  const createdIssues: Record<number, string> = {}
  for (const issue of issues) {
    const created = await prisma.issue.create({
      data: {
        number: issue.n,
        title: issue.title,
        description: `Auto-generated seed issue for resource planning demo`,
        type: issue.type as any,
        status: issue.status as any,
        priority: issue.priority as any,
        projectId,
        reporterId: user.clerkId,
        assigneeId: issue.assigneeId,
        sprintId: issue.sprintId,
        dueDate: issue.dueDate,
        startDate: issue.status !== 'TODO' ? d(-5) : null,
        parentId: [1, 8, 15].includes(issue.n) ? epic.id : undefined, // Some are children of epic (blocked)
      },
    })
    createdIssues[issue.n] = created.id
  }

  // Update issue counter
  await prisma.project.update({
    where: { id: projectId },
    data: { issueCounter: 25 },
  })

  console.log(`✅ Created ${issues.length + 1} issues (including epic)`)

  // 7. Create Resource Allocations with varied profiles
  console.log('\n⚙️ Creating resource allocations...')

  const allocations = [
    {
      userId: 'user_aarav_001',
      totalCapacityHours: 40,
      hourlyRate: 95,
      skillTags: ['backend', 'machine-learning', 'python', 'algorithms'],
      velocityScore: 1.3,
      burnoutRiskScore: 82,
      consecutiveOvertimeWeeks: 3,
      averageWeeklyHours: 52,
    },
    {
      userId: 'user_priya_002',
      totalCapacityHours: 40,
      hourlyRate: 80,
      skillTags: ['frontend', 'react', 'tailwind', 'figma'],
      velocityScore: 1.1,
      burnoutRiskScore: 55,
      consecutiveOvertimeWeeks: 1,
      averageWeeklyHours: 44,
    },
    {
      userId: 'user_rahul_003',
      totalCapacityHours: 40,
      hourlyRate: 85,
      skillTags: ['backend', 'prisma', 'api', 'devops'],
      velocityScore: 1.0,
      burnoutRiskScore: 25,
      consecutiveOvertimeWeeks: 0,
      averageWeeklyHours: 38,
    },
    {
      userId: 'user_sneha_004',
      totalCapacityHours: 40,
      hourlyRate: 90,
      skillTags: ['fullstack', 'react', 'node', 'api'],
      velocityScore: 0.9,
      burnoutRiskScore: 68,
      consecutiveOvertimeWeeks: 2,
      averageWeeklyHours: 48,
    },
    {
      userId: 'user_vikram_005',
      totalCapacityHours: 40,
      hourlyRate: 70,
      skillTags: ['devops', 'ci-cd', 'docker', 'documentation'],
      velocityScore: 1.2,
      burnoutRiskScore: 10,
      consecutiveOvertimeWeeks: 0,
      averageWeeklyHours: 30,
    },
    {
      userId: 'user_ananya_006',
      totalCapacityHours: 40,
      hourlyRate: 75,
      skillTags: ['frontend', 'backend', 'testing', 'react'],
      velocityScore: 1.15,
      burnoutRiskScore: 5,
      consecutiveOvertimeWeeks: 0,
      averageWeeklyHours: 20,
    },
  ]

  for (const alloc of allocations) {
    const memberTasks = issues.filter(
      i => i.assigneeId === alloc.userId && i.status !== 'DONE'
    )
    const allocatedHours = memberTasks.length * 8

    await prisma.resourceAllocation.create({
      data: {
        projectId,
        userId: alloc.userId,
        sprintId: sprint.id,
        totalCapacityHours: alloc.totalCapacityHours,
        allocatedHours,
        availableHours: Math.max(0, alloc.totalCapacityHours - allocatedHours),
        hourlyRate: alloc.hourlyRate,
        costThisSprint: alloc.hourlyRate * allocatedHours,
        velocityScore: alloc.velocityScore,
        skillTags: alloc.skillTags,
        burnoutRiskScore: alloc.burnoutRiskScore,
        consecutiveOvertimeWeeks: alloc.consecutiveOvertimeWeeks,
        averageWeeklyHours: alloc.averageWeeklyHours,
      },
    })
  }

  console.log(`✅ Created ${allocations.length} resource allocations`)

  // 8. Create Resource Config
  console.log('\n⚡ Creating resource config...')
  await prisma.resourceConfig.create({
    data: {
      projectId,
      deliverySlippageWeight: 0.4,
      costOverrunWeight: 0.2,
      overworkWeight: 0.25,
      onTimeBonusWeight: 0.15,
      planningCycleType: 'DAILY',
      maxChangesPerCycle: 8,
      learningEnabled: true,
      burnoutThreshold: 70,
      overworkHoursWeekly: 50,
      idleThresholdPercent: 30,
    },
  })
  console.log('✅ Resource config created')

  // 9. Create historical planning cycle snapshots (for confidence chart)
  console.log('\n📊 Creating historical snapshots...')
  const historicalConfidence = [
    { daysAgo: 12, confidence: 91 },
    { daysAgo: 11, confidence: 88 },
    { daysAgo: 10, confidence: 85 },
    { daysAgo: 9, confidence: 82 },
    { daysAgo: 8, confidence: 78 },
    { daysAgo: 7, confidence: 74 },
    { daysAgo: 6, confidence: 70 },
    { daysAgo: 5, confidence: 65 },
    { daysAgo: 4, confidence: 62 },
    { daysAgo: 3, confidence: 58 },
    { daysAgo: 2, confidence: 55 },
    { daysAgo: 1, confidence: 52 },
  ]

  for (const snap of historicalConfidence) {
    const snapDate = new Date(now)
    snapDate.setDate(snapDate.getDate() - snap.daysAgo)

    await prisma.planningCycleSnapshot.create({
      data: {
        projectId,
        deliveryConfidence: snap.confidence,
        cycleType: 'DAILY',
        createdAt: snapDate,
        taskBacklog: {
          totalTasks: 25,
          byStatus: { TODO: 10, IN_PROGRESS: 8, IN_REVIEW: 3, DONE: 4 },
        },
        currentAssignments: {},
        capacityMap: {},
        sprintDeadlines: {},
        costRates: {},
        overworkIndicators: {},
      },
    })
  }

  console.log(`✅ Created ${historicalConfidence.length} historical snapshots`)

  // 10. Create some historical recommendations with outcomes
  console.log('\n💡 Creating historical recommendations...')

  // Create a snapshot for previous recommendations
  const prevSnapshot = await prisma.planningCycleSnapshot.create({
    data: {
      projectId,
      deliveryConfidence: 55,
      cycleType: 'DAILY',
      createdAt: d(-1),
      taskBacklog: { totalTasks: 23, byStatus: { TODO: 12, IN_PROGRESS: 6, IN_REVIEW: 2, DONE: 3 } },
      currentAssignments: {},
      capacityMap: {},
      sprintDeadlines: {},
      costRates: {},
      overworkIndicators: {},
    },
  })

  // Historical accepted recommendation
  const acceptedRec = await prisma.recommendation.create({
    data: {
      snapshotId: prevSnapshot.id,
      type: 'REASSIGN_TASK',
      status: 'ACCEPTED',
      title: 'Reassign "Set up CI/CD pipeline" from Aarav → Vikram',
      description: 'Aarav is overloaded. Vikram has devops skills and available capacity.',
      reason: 'Aarav at 140% utilization with 82% burnout risk.',
      actionPayload: {
        type: 'REASSIGN_TASK',
        fromUserId: 'user_aarav_001',
        fromUserName: 'Aarav Sharma',
        toUserId: 'user_vikram_005',
        toUserName: 'Vikram Singh',
        reason: 'Overload relief',
      },
      deliveryProbabilityChange: 18,
      costImpactPercent: -5,
      burnoutRiskChange: -15,
      impactScore: 12.5,
      decidedBy: user.clerkId,
      decidedAt: d(-1),
    },
  })

  await prisma.recommendationOutcome.create({
    data: {
      recommendationId: acceptedRec.id,
      actualDeliveryChange: 15,
      actualCostChange: -3,
      actualBurnoutChange: -12,
      taskCompletedOnTime: true,
      notes: 'Task completed ahead of schedule after reassignment.',
      measuredAt: d(-1),
    },
  })

  // Historical rejected recommendation
  await prisma.recommendation.create({
    data: {
      snapshotId: prevSnapshot.id,
      type: 'DELAY_TASK',
      status: 'REJECTED',
      title: 'Delay "API integration" by 3 days',
      description: 'Task is at risk due to complexity.',
      reason: 'Dependencies unresolved.',
      actionPayload: { type: 'DELAY_TASK', delayDays: 3 },
      deliveryProbabilityChange: 10,
      costImpactPercent: 2,
      burnoutRiskChange: -5,
      impactScore: 7.2,
      decidedBy: user.clerkId,
      decidedAt: d(-1),
      rejectionReason: 'Client deadline is fixed, cannot delay.',
    },
  })

  console.log('✅ Created 2 historical recommendations with outcomes')

  // 11. Create audit log entries
  console.log('\n📝 Creating audit log entries...')
  const auditEntries = [
    { daysAgo: 5, action: 'PLANNING_CYCLE_RUN', details: { cycleType: 'DAILY', recommendationsGenerated: 3, deliveryConfidence: 70 } },
    { daysAgo: 4, action: 'RECOMMENDATION_ACCEPTED', details: { type: 'REASSIGN_TASK', title: 'Reassign testing task from Sneha → Rahul' } },
    { daysAgo: 3, action: 'PLANNING_CYCLE_RUN', details: { cycleType: 'DAILY', recommendationsGenerated: 4, deliveryConfidence: 62 } },
    { daysAgo: 2, action: 'RECOMMENDATION_REJECTED', details: { type: 'DELAY_TASK', title: 'Delay sprint review by 2 days', rejectionReason: 'Stakeholder meeting already scheduled' } },
    { daysAgo: 2, action: 'CONFIG_UPDATED', details: { field: 'burnoutThreshold', oldValue: 80, newValue: 70 } },
    { daysAgo: 1, action: 'PLANNING_CYCLE_RUN', details: { cycleType: 'DAILY', recommendationsGenerated: 5, deliveryConfidence: 55 } },
    { daysAgo: 1, action: 'RECOMMENDATION_ACCEPTED', details: { type: 'REASSIGN_TASK', title: 'Reassign CI/CD pipeline from Aarav → Vikram' } },
  ]

  for (const entry of auditEntries) {
    const entryDate = new Date(now)
    entryDate.setDate(entryDate.getDate() - entry.daysAgo)

    await prisma.resourceAuditLog.create({
      data: {
        projectId,
        action: entry.action,
        actorId: user.clerkId,
        entityType: entry.action.includes('RECOMMENDATION') ? 'RECOMMENDATION' : 'SNAPSHOT',
        entityId: prevSnapshot.id,
        details: entry.details,
        createdAt: entryDate,
      },
    })
  }

  console.log(`✅ Created ${auditEntries.length} audit log entries`)

  // SUMMARY
  console.log('\n' + '='.repeat(60))
  console.log('🎉 SEED COMPLETE — Resource Planning Data Summary')
  console.log('='.repeat(60))
  console.log(`\n  Project:     ${project.name} (${project.key})`)
  console.log(`  Project ID:  ${projectId}`)
  console.log(`  Sprint:      ${sprint.name} (ends in 5 days)`)
  console.log(`\n  Team Members: ${teamMembers.length + 1} (including owner)`)
  console.log(`    🔴 Aarav    — 7 tasks, OVERLOADED, burnout 82%`)
  console.log(`    🟡 Priya    — 4 tasks, BUSY, 1 overdue`)
  console.log(`    🟢 Rahul    — 3 tasks (2 done), NORMAL`)
  console.log(`    🟠 Sneha    — 5 tasks, BUSY, 1 overdue, high burnout`)
  console.log(`    🔵 Vikram   — 2 tasks (1 done), LIGHT`)
  console.log(`    ⚪ Ananya   — 0 tasks, IDLE, available`)
  console.log(`\n  Issues: ${issues.length + 1} total`)
  console.log(`    2 unassigned CRITICAL/HIGH tasks`)
  console.log(`    2 overdue tasks`)
  console.log(`    2 IN_REVIEW tasks (waiting for reviewer)`)
  console.log(`    2 backlog items`)
  console.log(`\n  Historical:`)
  console.log(`    ${historicalConfidence.length} confidence snapshots`)
  console.log(`    2 previous recommendations (1 accepted, 1 rejected)`)
  console.log(`    ${auditEntries.length} audit log entries`)
  console.log(`\n  Expected Recommendations After Planning Cycle:`)
  console.log(`    • Reassign tasks from Aarav → Ananya/Vikram`)
  console.log(`    • Rebalance workload (140%→0% gap)`)
  console.log(`    • Add reviewer for IN_REVIEW tasks`)
  console.log(`    • Flag overdue tasks for delay`)
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
