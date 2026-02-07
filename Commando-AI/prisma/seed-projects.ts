import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seeds 3 realistic projects with full data:
 *   - Team members, sprints, issues, resource allocations, snapshots, recommendations, audit logs
 *
 * Run:  npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-projects.ts
 */
async function main() {
  console.log('🚀 Seeding 3 realistic projects...\n')

  // ── Owner: Vinay ──────────────────────────────────────────────────────
  const OWNER_ID = 'user_37hcpUmzBHFx9CMkKMxbjeOkVuH'

  // Existing team member clerk IDs (created by earlier seed)
  const TEAM = {
    aarav:   'user_aarav_001',
    priya:   'user_priya_002',
    rahul:   'user_rahul_003',
    sneha:   'user_sneha_004',
    vikram:  'user_vikram_005',
    ananya:  'user_ananya_006',
    kristina:'user_39LSY16tVr6pf9Qn1Ty7pFs3GCw',
    virus:   'user_37WoBjtLBxW0BCi7H3cBtJja6RV',
  }

  // helper: date offset from now
  const d = (offset: number) => {
    const dt = new Date()
    dt.setDate(dt.getDate() + offset)
    return dt
  }

  // =====================================================================
  // PROJECT 1 — E-Commerce Platform Rebuild
  // =====================================================================
  console.log('━━━ Project 1: ShopStream ━━━')

  const p1 = await prisma.project.upsert({
    where: { key: 'SHOP' },
    update: {},
    create: {
      name: 'ShopStream',
      key: 'SHOP',
      description:
        'Full rebuild of the legacy e-commerce platform to a modern Next.js + microservices architecture. Includes product catalog, cart, checkout, payment integrations (Stripe/Razorpay), order fulfilment pipeline, and admin dashboard with real-time analytics.',
      ownerId: OWNER_ID,
    },
  })
  console.log(`  ✅ Project: ${p1.name} (${p1.id})`)

  // Setup
  await prisma.projectSetup.upsert({
    where: { projectId: p1.id },
    update: {},
    create: {
      projectId: p1.id,
      startDate: d(-45),
      endDate: d(90),
      teamSize: 6,
      techStack: 'Next.js 14, TypeScript, Prisma, PostgreSQL, Redis, Stripe, Tailwind CSS, Docker, AWS',
      vision: 'Deliver a blazing-fast, SEO-friendly storefront with sub-200ms TTFB and 99.9% checkout uptime.',
      aiInstructions: 'Focus on performance budgets. Flag any component exceeding 50KB bundle size.',
    },
  })

  // Members
  const p1Members = [
    { userId: TEAM.aarav,    role: 'ADMIN'  as const, dept: 'DEVELOPER'        as const },
    { userId: TEAM.priya,    role: 'MEMBER' as const, dept: 'DEVELOPER'        as const },
    { userId: TEAM.rahul,    role: 'MEMBER' as const, dept: 'DEVELOPER'        as const },
    { userId: TEAM.sneha,    role: 'MEMBER' as const, dept: 'QA_TESTER'        as const },
    { userId: TEAM.vikram,   role: 'MEMBER' as const, dept: 'DEVELOPER'        as const },
    { userId: TEAM.kristina, role: 'MEMBER' as const, dept: 'PROJECT_MANAGER'  as const },
  ]
  for (const m of p1Members) {
    await prisma.projectMember.upsert({
      where: { projectId_memberId: { projectId: p1.id, memberId: m.userId } },
      update: {},
      create: { projectId: p1.id, userId: m.userId, memberId: m.userId, role: m.role, departmentRole: m.dept },
    })
  }
  console.log(`  ✅ ${p1Members.length} team members`)

  // Sprints
  const s1a = await prisma.sprint.create({
    data: { projectId: p1.id, name: 'Sprint 1 – Foundation', goal: 'Auth, DB schema, CI/CD pipeline', startDate: d(-30), endDate: d(-16), status: 'COMPLETED' },
  })
  const s1b = await prisma.sprint.create({
    data: { projectId: p1.id, name: 'Sprint 2 – Catalog & Cart', goal: 'Product listing, search, cart flows', startDate: d(-14), endDate: d(0), status: 'ACTIVE' },
  })
  const s1c = await prisma.sprint.create({
    data: { projectId: p1.id, name: 'Sprint 3 – Checkout & Payments', goal: 'Stripe/Razorpay integration, order flow', startDate: d(1), endDate: d(14), status: 'PLANNED' },
  })
  console.log('  ✅ 3 sprints')

  // Issues
  const p1Issues = [
    // Sprint 1 (completed)
    { n: 1, title: 'Set up Next.js 14 monorepo', type: 'TASK', status: 'DONE', priority: 'HIGH', assignee: TEAM.aarav, sprintId: s1a.id, start: -30, due: -25 },
    { n: 2, title: 'Design Prisma schema for products, orders & users', type: 'TASK', status: 'DONE', priority: 'HIGH', assignee: TEAM.aarav, sprintId: s1a.id, start: -28, due: -23 },
    { n: 3, title: 'Configure CI/CD with GitHub Actions', type: 'TASK', status: 'DONE', priority: 'MEDIUM', assignee: TEAM.vikram, sprintId: s1a.id, start: -28, due: -22 },
    { n: 4, title: 'Set up Clerk authentication', type: 'TASK', status: 'DONE', priority: 'HIGH', assignee: TEAM.priya, sprintId: s1a.id, start: -27, due: -20 },
    { n: 5, title: 'Create base UI component library', type: 'TASK', status: 'DONE', priority: 'MEDIUM', assignee: TEAM.priya, sprintId: s1a.id, start: -25, due: -18 },
    { n: 6, title: 'Write integration tests for auth flow', type: 'TASK', status: 'DONE', priority: 'LOW', assignee: TEAM.sneha, sprintId: s1a.id, start: -22, due: -17 },

    // Sprint 2 (active – mixed statuses)
    { n: 7,  title: 'Build product catalog API endpoints', type: 'STORY', status: 'DONE', priority: 'HIGH', assignee: TEAM.aarav, sprintId: s1b.id, start: -14, due: -7 },
    { n: 8,  title: 'Product listing page with filters & pagination', type: 'STORY', status: 'DONE', priority: 'HIGH', assignee: TEAM.priya, sprintId: s1b.id, start: -14, due: -5 },
    { n: 9,  title: 'Full-text product search with Algolia', type: 'TASK', status: 'IN_PROGRESS', priority: 'HIGH', assignee: TEAM.aarav, sprintId: s1b.id, start: -10, due: -1 },
    { n: 10, title: 'Shopping cart state management (Zustand)', type: 'TASK', status: 'IN_PROGRESS', priority: 'HIGH', assignee: TEAM.priya, sprintId: s1b.id, start: -8, due: 0 },
    { n: 11, title: 'Cart API: add/remove/update quantities', type: 'TASK', status: 'IN_PROGRESS', priority: 'MEDIUM', assignee: TEAM.rahul, sprintId: s1b.id, start: -7, due: 0 },
    { n: 12, title: 'Product detail page with image gallery', type: 'TASK', status: 'TODO', priority: 'MEDIUM', assignee: TEAM.rahul, sprintId: s1b.id, start: -5, due: 1 },
    { n: 13, title: 'Write E2E tests for catalog browsing', type: 'TASK', status: 'TODO', priority: 'LOW', assignee: TEAM.sneha, sprintId: s1b.id, start: -3, due: 2 },
    { n: 14, title: 'Performance audit: bundle size & LCP', type: 'TASK', status: 'TODO', priority: 'CRITICAL', assignee: TEAM.vikram, sprintId: s1b.id, start: -2, due: 0 },

    // Sprint 3 (planned)
    { n: 15, title: 'Stripe payment gateway integration', type: 'STORY', status: 'TODO', priority: 'CRITICAL', assignee: TEAM.aarav, sprintId: s1c.id, start: 1, due: 8 },
    { n: 16, title: 'Razorpay fallback payment option', type: 'STORY', status: 'TODO', priority: 'HIGH', assignee: TEAM.rahul, sprintId: s1c.id, start: 3, due: 10 },
    { n: 17, title: 'Order confirmation & email notifications', type: 'TASK', status: 'TODO', priority: 'HIGH', assignee: TEAM.priya, sprintId: s1c.id, start: 5, due: 12 },
    { n: 18, title: 'Admin order management dashboard', type: 'STORY', status: 'TODO', priority: 'MEDIUM', assignee: TEAM.vikram, sprintId: s1c.id, start: 5, due: 13 },

    // Backlog (no sprint)
    { n: 19, title: 'Wishlist feature', type: 'STORY', status: 'TODO', priority: 'LOW', assignee: null, sprintId: null, start: null, due: null },
    { n: 20, title: 'Product reviews & rating system', type: 'EPIC', status: 'TODO', priority: 'MEDIUM', assignee: null, sprintId: null, start: null, due: null },
  ]

  for (const issue of p1Issues) {
    await prisma.issue.upsert({
      where: { projectId_number: { projectId: p1.id, number: issue.n } },
      update: {},
      create: {
        projectId: p1.id,
        number: issue.n,
        title: issue.title,
        description: `Implementation details for: ${issue.title}`,
        type: issue.type as any,
        status: issue.status as any,
        priority: issue.priority as any,
        assigneeId: issue.assignee,
        reporterId: OWNER_ID,
        sprintId: issue.sprintId,
        startDate: issue.start !== null ? d(issue.start) : undefined,
        dueDate: issue.due !== null ? d(issue.due) : undefined,
      },
    })
  }
  await prisma.project.update({ where: { id: p1.id }, data: { issueCounter: 20 } })
  console.log(`  ✅ ${p1Issues.length} issues`)

  // Resource Allocations
  const p1Allocs = [
    { userId: TEAM.aarav,  cap: 45, alloc: 40, avail: 5,  rate: 95, vel: 1.3, skills: ['backend','typescript','prisma','aws'],     burnout: 72, overtime: 3 },
    { userId: TEAM.priya,  cap: 40, alloc: 35, avail: 5,  rate: 85, vel: 1.1, skills: ['frontend','react','tailwind','figma'],      burnout: 55, overtime: 1 },
    { userId: TEAM.rahul,  cap: 40, alloc: 28, avail: 12, rate: 75, vel: 0.9, skills: ['backend','node','payments','redis'],        burnout: 30, overtime: 0 },
    { userId: TEAM.sneha,  cap: 40, alloc: 20, avail: 20, rate: 70, vel: 1.0, skills: ['qa','playwright','cypress','testing'],      burnout: 15, overtime: 0 },
    { userId: TEAM.vikram, cap: 40, alloc: 38, avail: 2,  rate: 90, vel: 1.2, skills: ['devops','docker','aws','performance','ci'], burnout: 65, overtime: 2 },
    { userId: TEAM.kristina, cap: 20, alloc: 12, avail: 8, rate: 80, vel: 1.0, skills: ['management','planning','analytics'],       burnout: 20, overtime: 0 },
  ]
  for (const a of p1Allocs) {
    await prisma.resourceAllocation.create({
      data: {
        projectId: p1.id, userId: a.userId,
        totalCapacityHours: a.cap, allocatedHours: a.alloc, availableHours: a.avail,
        hourlyRate: a.rate, costThisSprint: a.alloc * a.rate,
        velocityScore: a.vel, skillTags: a.skills,
        burnoutRiskScore: a.burnout, consecutiveOvertimeWeeks: a.overtime, averageWeeklyHours: a.alloc + Math.random() * 5,
      },
    })
  }
  console.log(`  ✅ ${p1Allocs.length} resource allocations`)

  // Config
  await prisma.resourceConfig.upsert({
    where: { projectId: p1.id },
    update: {},
    create: {
      projectId: p1.id,
      deliverySlippageWeight: 0.4, costOverrunWeight: 0.2, overworkWeight: 0.25, onTimeBonusWeight: 0.15,
      maxChangesPerCycle: 5, learningEnabled: true, burnoutThreshold: 70, overworkHoursWeekly: 50, idleThresholdPercent: 30,
    },
  })

  // Snapshots + Recommendations
  const snap1 = await prisma.planningCycleSnapshot.create({
    data: {
      projectId: p1.id,
      deliveryConfidence: 68,
      cycleType: 'DAILY',
      createdAt: d(-3),
      taskBacklog: { totalTasks: 20, byStatus: { TODO: 8, IN_PROGRESS: 3, IN_REVIEW: 0, DONE: 9 }, byPriority: { CRITICAL: 2, HIGH: 7, MEDIUM: 6, LOW: 5 } },
      currentAssignments: { [TEAM.aarav]: [7,9,15], [TEAM.priya]: [8,10,17], [TEAM.rahul]: [11,12,16], [TEAM.sneha]: [13], [TEAM.vikram]: [14,18] },
      capacityMap: { [TEAM.aarav]: { available: 5, used: 40, max: 45 }, [TEAM.priya]: { available: 5, used: 35, max: 40 } },
      sprintDeadlines: { [s1b.id]: d(0).toISOString(), [s1c.id]: d(14).toISOString() },
      costRates: { [TEAM.aarav]: 95, [TEAM.priya]: 85, [TEAM.rahul]: 75, [TEAM.sneha]: 70, [TEAM.vikram]: 90 },
      overworkIndicators: { [TEAM.aarav]: { score: 72, hoursThisWeek: 47, trend: 'rising' }, [TEAM.vikram]: { score: 65, hoursThisWeek: 44, trend: 'stable' } },
    },
  })

  await prisma.recommendation.createMany({
    data: [
      {
        snapshotId: snap1.id, type: 'REASSIGN_TASK', status: 'PENDING',
        title: 'Reassign "Performance audit" from Vikram to Aarav',
        description: 'Vikram is at 95% utilization with rising burnout. Aarav has backend perf skills and completes the sprint sooner.',
        reason: 'Vikram burnout risk 65% and 2 consecutive overtime weeks. Aarav has AWS/performance background.',
        actionPayload: { taskNumber: 14, fromUser: TEAM.vikram, toUser: TEAM.aarav },
        deliveryProbabilityChange: 8, costImpactPercent: 5, burnoutRiskChange: -18, impactScore: 7.2,
      },
      {
        snapshotId: snap1.id, type: 'REBALANCE_WORKLOAD', status: 'PENDING',
        title: 'Move "Product detail page" to Sneha (pair with Rahul)',
        description: 'Sneha is under-utilized at 50%. Pairing with Rahul frees him to start payment prep for Sprint 3.',
        reason: 'Sneha utilization only 50%, Rahul needs bandwidth for upcoming Razorpay task.',
        actionPayload: { taskNumber: 12, fromUser: TEAM.rahul, toUser: TEAM.sneha },
        deliveryProbabilityChange: 5, costImpactPercent: -2, burnoutRiskChange: -8, impactScore: 5.8,
      },
      {
        snapshotId: snap1.id, type: 'DELAY_TASK', status: 'PENDING',
        title: 'Defer "Wishlist feature" to Sprint 4',
        description: 'Wishlist is low priority and no sprint is assigned. Keeping it in backlog avoids scope creep.',
        reason: 'Low priority with no dependencies. Team capacity is fully committed for next 2 sprints.',
        actionPayload: { taskNumber: 19 },
        deliveryProbabilityChange: 2, costImpactPercent: 0, burnoutRiskChange: 0, impactScore: 2.1,
      },
    ],
  })

  // Historical snapshots for confidence trend
  for (let i = 10; i >= 1; i--) {
    await prisma.planningCycleSnapshot.create({
      data: {
        projectId: p1.id,
        deliveryConfidence: Math.min(95, 55 + i * 3 + (Math.random() * 6 - 3)),
        cycleType: 'DAILY',
        createdAt: d(-i * 3),
        taskBacklog: { totalTasks: 20 },
        currentAssignments: {},
        capacityMap: {},
        sprintDeadlines: {},
        costRates: {},
        overworkIndicators: {},
      },
    })
  }
  console.log('  ✅ Snapshots + 3 recommendations')

  // Audit logs
  await prisma.resourceAuditLog.createMany({
    data: [
      { projectId: p1.id, action: 'PLANNING_CYCLE_RUN', actorId: 'SYSTEM', entityType: 'SNAPSHOT', entityId: snap1.id, details: { recommendations: 3 }, createdAt: d(-3) },
      { projectId: p1.id, action: 'CONFIG_UPDATED', actorId: OWNER_ID, entityType: 'CONFIG', entityId: p1.id, details: { changed: ['burnoutThreshold'], from: 80, to: 70 }, createdAt: d(-5) },
      { projectId: p1.id, action: 'ALLOCATION_UPDATED', actorId: OWNER_ID, entityType: 'ALLOCATION', entityId: TEAM.aarav, details: { totalCapacityHours: { from: 40, to: 45 } }, createdAt: d(-7) },
      { projectId: p1.id, action: 'RECOMMENDATION_ACCEPTED', actorId: OWNER_ID, entityType: 'RECOMMENDATION', entityId: 'historical-1', details: { type: 'REASSIGN_TASK', title: 'Moved auth task to Priya' }, createdAt: d(-20) },
      { projectId: p1.id, action: 'PLANNING_CYCLE_RUN', actorId: 'SYSTEM', entityType: 'SNAPSHOT', entityId: 'historical-snap', details: { recommendations: 2 }, createdAt: d(-20) },
    ],
  })
  console.log('  ✅ 5 audit log entries\n')

  // =====================================================================
  // PROJECT 2 — HealthPulse Mobile App
  // =====================================================================
  console.log('━━━ Project 2: HealthPulse ━━━')

  const p2 = await prisma.project.upsert({
    where: { key: 'HLTH' },
    update: {},
    create: {
      name: 'HealthPulse',
      key: 'HLTH',
      description:
        'Patient-facing mobile health app with appointment booking, telemedicine video calls, prescription management, health record storage (FHIR-compliant), and wearable device sync. React Native frontend with a Node.js/Express backend.',
      ownerId: OWNER_ID,
    },
  })
  console.log(`  ✅ Project: ${p2.name} (${p2.id})`)

  await prisma.projectSetup.upsert({
    where: { projectId: p2.id },
    update: {},
    create: {
      projectId: p2.id,
      startDate: d(-60),
      endDate: d(60),
      teamSize: 5,
      techStack: 'React Native, Expo, TypeScript, Node.js, Express, PostgreSQL, Redis, WebRTC, FHIR API',
      vision: 'HIPAA-compliant telehealth platform enabling 10k daily consultations with < 500ms API latency.',
      aiInstructions: 'Prioritise security and compliance tasks. Flag any direct DB access without middleware auth.',
    },
  })

  const p2Members = [
    { userId: TEAM.priya,   role: 'ADMIN'  as const, dept: 'DEVELOPER'       as const },
    { userId: TEAM.rahul,   role: 'MEMBER' as const, dept: 'DEVELOPER'       as const },
    { userId: TEAM.ananya,  role: 'MEMBER' as const, dept: 'DEVELOPER'       as const },
    { userId: TEAM.sneha,   role: 'MEMBER' as const, dept: 'QA_TESTER'       as const },
    { userId: TEAM.virus,   role: 'MEMBER' as const, dept: 'PROJECT_MANAGER' as const },
  ]
  for (const m of p2Members) {
    await prisma.projectMember.upsert({
      where: { projectId_memberId: { projectId: p2.id, memberId: m.userId } },
      update: {},
      create: { projectId: p2.id, userId: m.userId, memberId: m.userId, role: m.role, departmentRole: m.dept },
    })
  }
  console.log(`  ✅ ${p2Members.length} team members`)

  const s2a = await prisma.sprint.create({
    data: { projectId: p2.id, name: 'Sprint 4 – Appointments', goal: 'Booking flow, doctor availability, reminders', startDate: d(-14), endDate: d(0), status: 'ACTIVE' },
  })
  const s2b = await prisma.sprint.create({
    data: { projectId: p2.id, name: 'Sprint 5 – Telemedicine', goal: 'WebRTC video calls, chat, prescriptions', startDate: d(1), endDate: d(14), status: 'PLANNED' },
  })
  console.log('  ✅ 2 sprints')

  const p2Issues = [
    // Active sprint
    { n: 1,  title: 'Appointment booking calendar UI', type: 'STORY', status: 'DONE', priority: 'HIGH', assignee: TEAM.priya, sprintId: s2a.id, start: -14, due: -7 },
    { n: 2,  title: 'Doctor availability API integration', type: 'TASK', status: 'DONE', priority: 'HIGH', assignee: TEAM.rahul, sprintId: s2a.id, start: -14, due: -8 },
    { n: 3,  title: 'Push notification reminders (Expo)', type: 'TASK', status: 'IN_PROGRESS', priority: 'MEDIUM', assignee: TEAM.ananya, sprintId: s2a.id, start: -10, due: -1 },
    { n: 4,  title: 'Patient health record FHIR schema', type: 'TASK', status: 'IN_PROGRESS', priority: 'CRITICAL', assignee: TEAM.rahul, sprintId: s2a.id, start: -8, due: 0 },
    { n: 5,  title: 'Appointment cancellation & rescheduling', type: 'TASK', status: 'IN_PROGRESS', priority: 'HIGH', assignee: TEAM.priya, sprintId: s2a.id, start: -6, due: 0 },
    { n: 6,  title: 'E2E test: booking → confirmation flow', type: 'TASK', status: 'TODO', priority: 'MEDIUM', assignee: TEAM.sneha, sprintId: s2a.id, start: -3, due: 1 },
    { n: 7,  title: 'HIPAA compliance audit on appointment data', type: 'BUG', status: 'TODO', priority: 'CRITICAL', assignee: null, sprintId: s2a.id, start: -2, due: 0 },

    // Planned sprint
    { n: 8,  title: 'WebRTC video call module', type: 'STORY', status: 'TODO', priority: 'CRITICAL', assignee: TEAM.rahul, sprintId: s2b.id, start: 1, due: 10 },
    { n: 9,  title: 'In-call chat & file sharing', type: 'TASK', status: 'TODO', priority: 'HIGH', assignee: TEAM.ananya, sprintId: s2b.id, start: 3, due: 11 },
    { n: 10, title: 'Prescription PDF generation', type: 'TASK', status: 'TODO', priority: 'HIGH', assignee: TEAM.priya, sprintId: s2b.id, start: 5, due: 13 },
    { n: 11, title: 'Wearable device sync (Apple Health, Fitbit)', type: 'STORY', status: 'TODO', priority: 'MEDIUM', assignee: TEAM.ananya, sprintId: s2b.id, start: 7, due: 14 },

    // Backlog
    { n: 12, title: 'Multi-language support (i18n)', type: 'STORY', status: 'TODO', priority: 'LOW', assignee: null, sprintId: null, start: null, due: null },
    { n: 13, title: 'Patient portal web companion', type: 'EPIC', status: 'TODO', priority: 'MEDIUM', assignee: null, sprintId: null, start: null, due: null },
    { n: 14, title: 'Insurance claim auto-submission', type: 'STORY', status: 'TODO', priority: 'LOW', assignee: null, sprintId: null, start: null, due: null },
  ]
  for (const issue of p2Issues) {
    await prisma.issue.upsert({
      where: { projectId_number: { projectId: p2.id, number: issue.n } },
      update: {},
      create: {
        projectId: p2.id, number: issue.n, title: issue.title,
        description: `Implementation details for: ${issue.title}`,
        type: issue.type as any, status: issue.status as any, priority: issue.priority as any,
        assigneeId: issue.assignee, reporterId: OWNER_ID,
        sprintId: issue.sprintId,
        startDate: issue.start !== null ? d(issue.start) : undefined,
        dueDate: issue.due !== null ? d(issue.due) : undefined,
      },
    })
  }
  await prisma.project.update({ where: { id: p2.id }, data: { issueCounter: 14 } })
  console.log(`  ✅ ${p2Issues.length} issues`)

  const p2Allocs = [
    { userId: TEAM.priya,  cap: 40, alloc: 36, avail: 4,  rate: 85, vel: 1.15, skills: ['react-native','typescript','ui','expo'],      burnout: 60, overtime: 2 },
    { userId: TEAM.rahul,  cap: 40, alloc: 38, avail: 2,  rate: 80, vel: 1.0,  skills: ['backend','node','fhir','webrtc','postgres'],  burnout: 68, overtime: 2 },
    { userId: TEAM.ananya, cap: 40, alloc: 25, avail: 15, rate: 70, vel: 0.85, skills: ['react-native','expo','notifications','mobile'], burnout: 22, overtime: 0 },
    { userId: TEAM.sneha,  cap: 35, alloc: 16, avail: 19, rate: 70, vel: 1.0,  skills: ['qa','detox','appium','testing','hipaa'],       burnout: 10, overtime: 0 },
    { userId: TEAM.virus,  cap: 20, alloc: 10, avail: 10, rate: 75, vel: 1.0,  skills: ['management','scrum','stakeholders'],            burnout: 12, overtime: 0 },
  ]
  for (const a of p2Allocs) {
    await prisma.resourceAllocation.create({
      data: {
        projectId: p2.id, userId: a.userId,
        totalCapacityHours: a.cap, allocatedHours: a.alloc, availableHours: a.avail,
        hourlyRate: a.rate, costThisSprint: a.alloc * a.rate,
        velocityScore: a.vel, skillTags: a.skills,
        burnoutRiskScore: a.burnout, consecutiveOvertimeWeeks: a.overtime, averageWeeklyHours: a.alloc + Math.random() * 4,
      },
    })
  }
  console.log(`  ✅ ${p2Allocs.length} resource allocations`)

  await prisma.resourceConfig.upsert({
    where: { projectId: p2.id },
    update: {},
    create: {
      projectId: p2.id,
      deliverySlippageWeight: 0.45, costOverrunWeight: 0.15, overworkWeight: 0.25, onTimeBonusWeight: 0.15,
      maxChangesPerCycle: 4, learningEnabled: true, burnoutThreshold: 65, overworkHoursWeekly: 45, idleThresholdPercent: 25,
    },
  })

  const snap2 = await prisma.planningCycleSnapshot.create({
    data: {
      projectId: p2.id, deliveryConfidence: 54, cycleType: 'DAILY', createdAt: d(-2),
      taskBacklog: { totalTasks: 14, byStatus: { TODO: 7, IN_PROGRESS: 3, DONE: 4 }, byPriority: { CRITICAL: 3, HIGH: 4, MEDIUM: 4, LOW: 3 } },
      currentAssignments: { [TEAM.priya]: [1,5,10], [TEAM.rahul]: [2,4,8], [TEAM.ananya]: [3,9,11], [TEAM.sneha]: [6] },
      capacityMap: { [TEAM.priya]: { available: 4, used: 36, max: 40 }, [TEAM.rahul]: { available: 2, used: 38, max: 40 } },
      sprintDeadlines: { [s2a.id]: d(0).toISOString(), [s2b.id]: d(14).toISOString() },
      costRates: { [TEAM.priya]: 85, [TEAM.rahul]: 80, [TEAM.ananya]: 70, [TEAM.sneha]: 70 },
      overworkIndicators: { [TEAM.rahul]: { score: 68, hoursThisWeek: 46, trend: 'rising' }, [TEAM.priya]: { score: 60, hoursThisWeek: 42, trend: 'stable' } },
    },
  })

  await prisma.recommendation.createMany({
    data: [
      {
        snapshotId: snap2.id, type: 'REASSIGN_TASK', status: 'PENDING',
        title: 'Assign HIPAA compliance audit to Sneha',
        description: 'Critical unassigned task due today. Sneha has HIPAA testing expertise and 54% available capacity.',
        reason: 'HIPAA audit is CRITICAL priority with no assignee. Sneha has relevant skills and bandwidth.',
        actionPayload: { taskNumber: 7, toUser: TEAM.sneha },
        deliveryProbabilityChange: 15, costImpactPercent: 3, burnoutRiskChange: 5, impactScore: 8.5,
      },
      {
        snapshotId: snap2.id, type: 'REASSIGN_TASK', status: 'PENDING',
        title: 'Move FHIR schema work from Rahul to Ananya',
        description: 'Rahul is at 95% utilization with burnout risk 68%. Ananya has 15h available and can take guidance from Rahul.',
        reason: 'Rahul approaching burnout threshold. Ananya under-utilized with mobile API experience.',
        actionPayload: { taskNumber: 4, fromUser: TEAM.rahul, toUser: TEAM.ananya },
        deliveryProbabilityChange: 6, costImpactPercent: -4, burnoutRiskChange: -22, impactScore: 7.1,
      },
    ],
  })

  for (let i = 8; i >= 1; i--) {
    await prisma.planningCycleSnapshot.create({
      data: {
        projectId: p2.id,
        deliveryConfidence: Math.min(90, 70 - i * 2 + (Math.random() * 8 - 4)),
        cycleType: 'DAILY', createdAt: d(-i * 4),
        taskBacklog: { totalTasks: 14 }, currentAssignments: {}, capacityMap: {},
        sprintDeadlines: {}, costRates: {}, overworkIndicators: {},
      },
    })
  }
  console.log('  ✅ Snapshots + 2 recommendations')

  await prisma.resourceAuditLog.createMany({
    data: [
      { projectId: p2.id, action: 'PLANNING_CYCLE_RUN', actorId: 'SYSTEM', entityType: 'SNAPSHOT', entityId: snap2.id, details: { recommendations: 2 }, createdAt: d(-2) },
      { projectId: p2.id, action: 'RECOMMENDATION_REJECTED', actorId: OWNER_ID, entityType: 'RECOMMENDATION', entityId: 'hist-p2-1', details: { type: 'DELAY_TASK', reason: 'Client requires it this sprint' }, createdAt: d(-10) },
      { projectId: p2.id, action: 'PLANNING_CYCLE_RUN', actorId: 'SYSTEM', entityType: 'SNAPSHOT', entityId: 'hist-snap-p2', details: { recommendations: 3 }, createdAt: d(-10) },
    ],
  })
  console.log('  ✅ 3 audit log entries\n')

  // =====================================================================
  // PROJECT 3 — DevForge CLI Tool
  // =====================================================================
  console.log('━━━ Project 3: DevForge ━━━')

  const p3 = await prisma.project.upsert({
    where: { key: 'DFRG' },
    update: {},
    create: {
      name: 'DevForge',
      key: 'DFRG',
      description:
        'Open-source developer productivity CLI that scaffolds projects, manages environment configs, runs database migrations, and orchestrates Docker-based dev environments. Written in Rust with cross-platform support.',
      ownerId: OWNER_ID,
    },
  })
  console.log(`  ✅ Project: ${p3.name} (${p3.id})`)

  await prisma.projectSetup.upsert({
    where: { projectId: p3.id },
    update: {},
    create: {
      projectId: p3.id,
      startDate: d(-20),
      endDate: d(40),
      teamSize: 3,
      techStack: 'Rust, Clap, Tokio, SQLite, Docker SDK, GitHub API, Cross-compilation (musl)',
      vision: 'Replace 5+ separate dev tools with a single, fast CLI that boots any project in under 10 seconds.',
      aiInstructions: 'Optimise for binary size. Avoid async where sync is sufficient. Target < 15MB binary.',
    },
  })

  const p3Members = [
    { userId: TEAM.vikram, role: 'ADMIN'  as const, dept: 'DEVELOPER' as const },
    { userId: TEAM.aarav,  role: 'MEMBER' as const, dept: 'DEVELOPER' as const },
    { userId: TEAM.ananya, role: 'MEMBER' as const, dept: 'DEVELOPER' as const },
  ]
  for (const m of p3Members) {
    await prisma.projectMember.upsert({
      where: { projectId_memberId: { projectId: p3.id, memberId: m.userId } },
      update: {},
      create: { projectId: p3.id, userId: m.userId, memberId: m.userId, role: m.role, departmentRole: m.dept },
    })
  }
  console.log(`  ✅ ${p3Members.length} team members`)

  const s3a = await prisma.sprint.create({
    data: { projectId: p3.id, name: 'Sprint 1 – Core CLI', goal: 'Arg parsing, config loader, plugin system', startDate: d(-14), endDate: d(0), status: 'ACTIVE' },
  })
  const s3b = await prisma.sprint.create({
    data: { projectId: p3.id, name: 'Sprint 2 – Docker & DB', goal: 'Docker compose orchestration, migration runner', startDate: d(1), endDate: d(14), status: 'PLANNED' },
  })

  const p3Issues = [
    { n: 1, title: 'CLI argument parser with Clap v4', type: 'TASK', status: 'DONE', priority: 'HIGH', assignee: TEAM.vikram, sprintId: s3a.id, start: -14, due: -10 },
    { n: 2, title: 'TOML/YAML config file loader', type: 'TASK', status: 'DONE', priority: 'HIGH', assignee: TEAM.vikram, sprintId: s3a.id, start: -12, due: -7 },
    { n: 3, title: 'Plugin system architecture (trait-based)', type: 'STORY', status: 'IN_PROGRESS', priority: 'CRITICAL', assignee: TEAM.aarav, sprintId: s3a.id, start: -10, due: -1 },
    { n: 4, title: 'Project scaffolding templates (Rust, Node, Python)', type: 'TASK', status: 'IN_PROGRESS', priority: 'HIGH', assignee: TEAM.ananya, sprintId: s3a.id, start: -7, due: 0 },
    { n: 5, title: 'Cross-platform binary builds (CI matrix)', type: 'TASK', status: 'TODO', priority: 'HIGH', assignee: TEAM.vikram, sprintId: s3a.id, start: -3, due: 0 },
    { n: 6, title: 'Unit tests for config parser', type: 'TASK', status: 'TODO', priority: 'MEDIUM', assignee: TEAM.ananya, sprintId: s3a.id, start: -2, due: 1 },
    { n: 7, title: 'Docker Compose orchestration module', type: 'STORY', status: 'TODO', priority: 'CRITICAL', assignee: TEAM.vikram, sprintId: s3b.id, start: 1, due: 8 },
    { n: 8, title: 'SQLite migration runner', type: 'TASK', status: 'TODO', priority: 'HIGH', assignee: TEAM.aarav, sprintId: s3b.id, start: 3, due: 10 },
    { n: 9, title: 'GitHub template repository sync', type: 'TASK', status: 'TODO', priority: 'MEDIUM', assignee: TEAM.ananya, sprintId: s3b.id, start: 5, due: 12 },
    { n: 10, title: 'Interactive TUI dashboard (ratatui)', type: 'STORY', status: 'TODO', priority: 'LOW', assignee: null, sprintId: null, start: null, due: null },
  ]
  for (const issue of p3Issues) {
    await prisma.issue.upsert({
      where: { projectId_number: { projectId: p3.id, number: issue.n } },
      update: {},
      create: {
        projectId: p3.id, number: issue.n, title: issue.title,
        description: `Implementation details for: ${issue.title}`,
        type: issue.type as any, status: issue.status as any, priority: issue.priority as any,
        assigneeId: issue.assignee, reporterId: OWNER_ID,
        sprintId: issue.sprintId,
        startDate: issue.start !== null ? d(issue.start) : undefined,
        dueDate: issue.due !== null ? d(issue.due) : undefined,
      },
    })
  }
  await prisma.project.update({ where: { id: p3.id }, data: { issueCounter: 10 } })
  console.log(`  ✅ ${p3Issues.length} issues`)

  const p3Allocs = [
    { userId: TEAM.vikram, cap: 40, alloc: 35, avail: 5,  rate: 90, vel: 1.3, skills: ['rust','docker','ci','devops','linux'], burnout: 48, overtime: 1 },
    { userId: TEAM.aarav,  cap: 30, alloc: 25, avail: 5,  rate: 95, vel: 1.1, skills: ['rust','backend','systems','postgres'],  burnout: 35, overtime: 0 },
    { userId: TEAM.ananya, cap: 30, alloc: 22, avail: 8,  rate: 70, vel: 0.9, skills: ['rust','python','templates','testing'],   burnout: 18, overtime: 0 },
  ]
  for (const a of p3Allocs) {
    await prisma.resourceAllocation.create({
      data: {
        projectId: p3.id, userId: a.userId,
        totalCapacityHours: a.cap, allocatedHours: a.alloc, availableHours: a.avail,
        hourlyRate: a.rate, costThisSprint: a.alloc * a.rate,
        velocityScore: a.vel, skillTags: a.skills,
        burnoutRiskScore: a.burnout, consecutiveOvertimeWeeks: a.overtime, averageWeeklyHours: a.alloc + Math.random() * 3,
      },
    })
  }
  console.log(`  ✅ ${p3Allocs.length} resource allocations`)

  await prisma.resourceConfig.upsert({
    where: { projectId: p3.id },
    update: {},
    create: {
      projectId: p3.id,
      deliverySlippageWeight: 0.35, costOverrunWeight: 0.25, overworkWeight: 0.2, onTimeBonusWeight: 0.2,
      maxChangesPerCycle: 3, learningEnabled: true, burnoutThreshold: 60, overworkHoursWeekly: 45, idleThresholdPercent: 35,
    },
  })

  const snap3 = await prisma.planningCycleSnapshot.create({
    data: {
      projectId: p3.id, deliveryConfidence: 78, cycleType: 'DAILY', createdAt: d(-1),
      taskBacklog: { totalTasks: 10, byStatus: { TODO: 5, IN_PROGRESS: 2, DONE: 3 }, byPriority: { CRITICAL: 2, HIGH: 4, MEDIUM: 2, LOW: 2 } },
      currentAssignments: { [TEAM.vikram]: [1,2,5,7], [TEAM.aarav]: [3,8], [TEAM.ananya]: [4,6,9] },
      capacityMap: { [TEAM.vikram]: { available: 5, used: 35, max: 40 }, [TEAM.aarav]: { available: 5, used: 25, max: 30 } },
      sprintDeadlines: { [s3a.id]: d(0).toISOString(), [s3b.id]: d(14).toISOString() },
      costRates: { [TEAM.vikram]: 90, [TEAM.aarav]: 95, [TEAM.ananya]: 70 },
      overworkIndicators: { [TEAM.vikram]: { score: 48, hoursThisWeek: 41, trend: 'stable' } },
    },
  })

  await prisma.recommendation.createMany({
    data: [
      {
        snapshotId: snap3.id, type: 'ADD_REVIEWER', status: 'PENDING',
        title: 'Add Vikram as reviewer on plugin architecture PR',
        description: 'Plugin system is CRITICAL and Aarav is working solo. Vikram has deep Rust trait experience.',
        reason: 'Single-developer bottleneck on critical-path task. Vikram can provide trait design review.',
        actionPayload: { taskNumber: 3, reviewer: TEAM.vikram },
        deliveryProbabilityChange: 10, costImpactPercent: 2, burnoutRiskChange: 3, impactScore: 6.8,
      },
    ],
  })

  for (let i = 6; i >= 1; i--) {
    await prisma.planningCycleSnapshot.create({
      data: {
        projectId: p3.id,
        deliveryConfidence: Math.min(95, 60 + i * 3 + (Math.random() * 5 - 2)),
        cycleType: 'DAILY', createdAt: d(-i * 3),
        taskBacklog: { totalTasks: 10 }, currentAssignments: {}, capacityMap: {},
        sprintDeadlines: {}, costRates: {}, overworkIndicators: {},
      },
    })
  }
  console.log('  ✅ Snapshots + 1 recommendation')

  await prisma.resourceAuditLog.createMany({
    data: [
      { projectId: p3.id, action: 'PLANNING_CYCLE_RUN', actorId: 'SYSTEM', entityType: 'SNAPSHOT', entityId: snap3.id, details: { recommendations: 1 }, createdAt: d(-1) },
      { projectId: p3.id, action: 'RECOMMENDATION_ACCEPTED', actorId: OWNER_ID, entityType: 'RECOMMENDATION', entityId: 'hist-p3-1', details: { type: 'REBALANCE_WORKLOAD', title: 'Shifted YAML loader to Ananya' }, createdAt: d(-8) },
    ],
  })
  console.log('  ✅ 2 audit log entries\n')

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════')
  console.log('✅ Seeding complete! 3 projects created:')
  console.log(`   1. ShopStream  (SHOP) — ${p1.id}`)
  console.log(`   2. HealthPulse (HLTH) — ${p2.id}`)
  console.log(`   3. DevForge    (DFRG) — ${p3.id}`)
  console.log('═══════════════════════════════════════════')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
