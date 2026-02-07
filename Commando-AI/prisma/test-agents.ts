/**
 * =====================================================================
 * Agent System End-to-End Test
 * =====================================================================
 *
 * This script tests the multi-agent collaboration system by:
 *   1. Creating agent profiles for the ShopStream project
 *   2. Building context for each agent type
 *   3. Running a full think cycle (LLM call) for each agent
 *   4. Processing the results (messages, decisions)
 *   5. Running a second cycle to test agent-to-agent communication
 *   6. Simulating human approval / rejection
 *   7. Printing a full report
 *
 * Run:
 *   npx tsx prisma/test-agents.ts
 *
 * Requires:
 *   - OPENAI_API_KEY in .env
 *   - Seeded ShopStream project (run seed-projects.ts first)
 *   - Database synced (npx prisma db push)
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually (no dotenv dependency needed)
const envPath = resolve(__dirname, '..', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.substring(0, eqIndex).trim()
    const value = trimmed.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
} catch { /* .env not found, rely on system env */ }

const prisma = new PrismaClient()

// ── Inline imports (can't use @/ aliases in tsx scripts) ──────────
// We'll dynamically import from the built modules using relative paths
// But since this is tsx with tsconfig paths, we can use the src paths directly

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║           🤖 AGENT COLLABORATION SYSTEM TEST 🤖            ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log()

  // ── Step 0: Find the ShopStream project ────────────────────────
  const project = await prisma.project.findUnique({
    where: { key: 'SHOP' },
    include: {
      members: { include: { user: true } },
      agentProfiles: true,
    },
  })

  if (!project) {
    console.error('❌ ShopStream project not found. Run seed-projects.ts first.')
    process.exit(1)
  }

  console.log(`📦 Project: ${project.name} (${project.key})`)
  console.log(`👥 Team: ${project.members.length} members`)
  console.log()

  // ── Step 1: Clean up old agent data ────────────────────────────
  console.log('🧹 Cleaning up old agent data...')
  await prisma.agentMessage.deleteMany({ where: { projectId: project.id } })
  await prisma.agentDecision.deleteMany({ where: { projectId: project.id } })
  await prisma.agentProfile.deleteMany({ where: { projectId: project.id } })
  console.log('   ✅ Cleaned\n')

  // ── Step 2: Create agent profiles ──────────────────────────────
  console.log('🤖 Creating agent profiles...')

  const adminMember = project.members.find(m => m.role === 'ADMIN')!
  const devMembers = project.members.filter(m => m.departmentRole === 'DEVELOPER')
  const qaMembers = project.members.filter(m => m.departmentRole === 'QA_TESTER')
  const pmMembers = project.members.filter(m => m.departmentRole === 'PROJECT_MANAGER')

  // Developer agents
  const agentProfiles = []
  for (const member of devMembers) {
    const agent = await prisma.agentProfile.create({
      data: {
        projectId: project.id,
        userId: member.userId,
        agentType: 'DEVELOPER',
        status: 'ACTIVE',
        trustScore: 0.5,
      },
    })
    const name = member.user?.name ?? member.user?.email ?? member.userId
    console.log(`   🧑‍💻 Developer agent: ${name} (${agent.id.slice(0, 8)}...)`)
    agentProfiles.push({ ...agent, name, role: 'DEVELOPER' })
  }

  // QA agents
  for (const member of qaMembers) {
    const agent = await prisma.agentProfile.create({
      data: {
        projectId: project.id,
        userId: member.userId,
        agentType: 'DEVELOPER', // QA uses developer agent too
        status: 'ACTIVE',
        trustScore: 0.5,
      },
    })
    const name = member.user?.name ?? member.user?.email ?? member.userId
    console.log(`   🧪 QA agent: ${name} (${agent.id.slice(0, 8)}...)`)
    agentProfiles.push({ ...agent, name, role: 'QA' })
  }

  // Manager agent
  const managerUser = pmMembers[0] ?? adminMember
  const managerAgent = await prisma.agentProfile.create({
    data: {
      projectId: project.id,
      userId: managerUser.userId,
      agentType: 'MANAGER',
      status: 'ACTIVE',
      trustScore: 0.5,
    },
  })
  console.log(`   👔 Manager agent: ${managerUser.user?.name ?? managerUser.userId} (${managerAgent.id.slice(0, 8)}...)`)
  agentProfiles.push({ ...managerAgent, name: managerUser.user?.name ?? managerUser.userId, role: 'MANAGER' })

  // Optimizer agent
  const optimizerAgent = await prisma.agentProfile.create({
    data: {
      projectId: project.id,
      userId: adminMember.userId,
      agentType: 'OPTIMIZER',
      status: 'ACTIVE',
      trustScore: 0.5,
    },
  })
  console.log(`   ⚡ Optimizer agent: ${adminMember.user?.name ?? adminMember.userId} (${optimizerAgent.id.slice(0, 8)}...)`)
  agentProfiles.push({ ...optimizerAgent, name: adminMember.user?.name ?? adminMember.userId, role: 'OPTIMIZER' })

  console.log(`\n   Total: ${agentProfiles.length} agents created\n`)

  // ── Step 3: Build context for one developer ────────────────────
  console.log('━'.repeat(60))
  console.log('📋 PHASE 1: Context Building & Single Agent Think')
  console.log('━'.repeat(60))

  // We need to use the actual agent framework. Since we can't use @/ aliases
  // in a standalone script, we'll use the AI SDK directly.
  const { generateText } = await import('ai')
  const { openai } = await import('@ai-sdk/openai')

  // Load issues for context
  const issues = await prisma.issue.findMany({
    where: { projectId: project.id, isArchived: false },
    include: {
      assignee: { select: { clerkId: true, name: true, email: true } },
      parent: { select: { id: true, status: true } },
    },
    orderBy: { number: 'asc' },
  })

  const allocations = await prisma.resourceAllocation.findMany({
    where: { projectId: project.id },
  })

  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: project.id, status: 'ACTIVE' },
  })

  console.log(`\n📊 Project State:`)
  console.log(`   Issues: ${issues.length} total`)
  console.log(`   Active sprint: ${activeSprint?.name ?? 'None'}`)
  console.log(`   Overdue: ${issues.filter(i => i.dueDate && i.dueDate < new Date() && i.status !== 'DONE').length}`)
  console.log(`   In Progress: ${issues.filter(i => i.status === 'IN_PROGRESS').length}`)
  console.log(`   Blocked: ${issues.filter(i => i.parent && i.parent.status !== 'DONE').length}`)

  // Build a context summary for each team member
  const now = new Date()
  const teamSummary = project.members.map(m => {
    const alloc = allocations.find(a => a.userId === m.userId)
    const memberIssues = issues.filter(i => i.assigneeId === m.userId && i.status !== 'DONE')
    const allocHours = memberIssues.length * 8
    const cap = alloc?.totalCapacityHours ?? 40
    return {
      userId: m.userId,
      name: m.user?.name ?? m.user?.email ?? m.userId,
      dept: m.departmentRole,
      tasks: memberIssues.length,
      utilization: cap > 0 ? Math.round((allocHours / cap) * 100) : 0,
      burnoutRisk: alloc?.burnoutRiskScore ?? 0,
      skills: alloc?.skillTags ?? [],
      availableHours: Math.max(0, cap - allocHours),
    }
  })

  console.log(`\n👥 Team Utilization:`)
  for (const m of teamSummary) {
    const bar = '█'.repeat(Math.min(20, Math.round(m.utilization / 5))) + '░'.repeat(Math.max(0, 20 - Math.round(m.utilization / 5)))
    const flag = m.utilization > 100 ? ' 🔴 OVERLOADED' : m.utilization > 80 ? ' ⚠️' : m.burnoutRisk > 60 ? ' 🔥 BURNOUT' : ''
    console.log(`   ${m.name.padEnd(20)} ${bar} ${m.utilization}% (${m.tasks} tasks, ${m.availableHours}h free)${flag}`)
  }

  // ── Step 4: Run think cycles for ALL agents ────────────────────
  console.log('\n' + '━'.repeat(60))
  console.log('🧠 PHASE 2: Running Agent Think Cycles (LLM Calls)')
  console.log('━'.repeat(60))

  const allResults: { agent: typeof agentProfiles[0]; reasoning: string; actions: any[] }[] = []

  // Run agents in order: Optimizer → Manager → Developers
  const orderedAgents = [
    ...agentProfiles.filter(a => a.role === 'OPTIMIZER'),
    ...agentProfiles.filter(a => a.role === 'MANAGER'),
    ...agentProfiles.filter(a => a.role === 'DEVELOPER' || a.role === 'QA'),
  ]

  for (const agentProfile of orderedAgents) {
    console.log(`\n🤖 Running ${agentProfile.role} agent for ${agentProfile.name}...`)

    // Build context string
    const myIssues = issues.filter(i => i.assigneeId === agentProfile.userId)
    const myActive = myIssues.filter(i => i.status !== 'DONE')
    const myOverdue = myActive.filter(i => i.dueDate && i.dueDate < now)

    // Check for pending messages to this agent
    const pendingMessages = await prisma.agentMessage.findMany({
      where: {
        projectId: project.id,
        OR: [{ toAgentId: agentProfile.id }, { toAgentId: null }],
        status: 'PENDING',
      },
      include: { fromAgent: true },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    let systemPrompt: string
    let roleContext: string

    if (agentProfile.agentType === 'OPTIMIZER') {
      systemPrompt = `You are an Optimizer Agent analyzing team-wide workload distribution and identifying bottlenecks. Be quantitative. Use numbers. Always respond with valid JSON.`
      const utils = teamSummary.map(m => m.utilization)
      const avg = utils.reduce((a, b) => a + b, 0) / utils.length
      const stdDev = Math.sqrt(utils.reduce((s, u) => s + (u - avg) ** 2, 0) / utils.length)
      roleContext = `### Optimizer Analysis
Avg utilization: ${avg.toFixed(0)}%, Std Dev: ${stdDev.toFixed(0)}%
Total active tasks: ${issues.filter(i => i.status !== 'DONE').length}
Total team available hours: ${teamSummary.reduce((s, m) => s + m.availableHours, 0)}h
Overloaded members: ${teamSummary.filter(m => m.utilization > 100).map(m => `${m.name} (${m.utilization}%)`).join(', ') || 'None'}
Underloaded members: ${teamSummary.filter(m => m.utilization < 50).map(m => `${m.name} (${m.availableHours}h free)`).join(', ') || 'None'}`
    } else if (agentProfile.agentType === 'MANAGER') {
      systemPrompt = `You are a Manager Agent overseeing the entire project. Monitor delivery confidence, coordinate between developers, prevent burnout. Always respond with valid JSON.`
      const overdue = issues.filter(i => i.dueDate && i.dueDate < now && i.status !== 'DONE')
      roleContext = `### Manager Analysis
Overdue tasks: ${overdue.length}
Sprint: ${activeSprint?.name ?? 'None'}, ${activeSprint?.endDate ? Math.max(0, Math.ceil((new Date(activeSprint.endDate).getTime() - now.getTime()) / 86400000)) + ' days left' : 'no deadline'}
Team burnout risks: ${teamSummary.filter(m => m.burnoutRisk > 50).map(m => `${m.name} (${m.burnoutRisk}%)`).join(', ') || 'None'}`
    } else {
      systemPrompt = `You are a Developer Agent representing ${agentProfile.name}. Protect their wellbeing, remove blockers, offer help when idle. Always respond with valid JSON.`
      const mySummary = teamSummary.find(m => m.userId === agentProfile.userId)
      roleContext = `### Developer Analysis
My utilization: ${mySummary?.utilization ?? 0}%, Burnout risk: ${mySummary?.burnoutRisk ?? 0}%
My overdue tasks: ${myOverdue.length}
My active tasks: ${myActive.length}
Skills: ${mySummary?.skills.join(', ') || 'None listed'}`
    }

    // Build messages section
    let messagesSection = ''
    if (pendingMessages.length > 0) {
      messagesSection = `\n## Incoming Messages (${pendingMessages.length})
${pendingMessages.map(m => `- [${m.messageType}] from ${m.fromAgent.agentType} agent: "${m.subject}"
  ${JSON.stringify(m.payload)}`).join('\n')}`
    }

    const prompt = `## Your Identity
You are the ${agentProfile.role} agent for **${agentProfile.name}** on **${project.name}**.
Trust score: 50%, Autonomy: SUGGEST

## Project State
Issues: ${issues.length} total, ${issues.filter(i => i.status === 'DONE').length} done, ${issues.filter(i => i.status === 'IN_PROGRESS').length} in-progress
Overdue: ${issues.filter(i => i.dueDate && i.dueDate < now && i.status !== 'DONE').length}
Sprint: ${activeSprint?.name ?? 'No active sprint'}

## My Tasks (${myActive.length})
${myActive.map(i => `- [${i.status}] #${i.number} "${i.title}" (${i.priority}${i.dueDate && i.dueDate < now ? ' ⚠️ OVERDUE' : ''})`).join('\n') || '(none)'}

## Team
${teamSummary.map(m => `- ${m.name}: ${m.utilization}% utilized, ${m.tasks} active tasks, ${m.availableHours}h free, burnout: ${m.burnoutRisk}%`).join('\n')}

${roleContext}
${messagesSection}

## Response Format
Respond with a JSON object:
{
  "reasoning": "Your analysis...",
  "mood": "focused|stressed|idle|collaborative|blocked",
  "activeGoals": ["goal1"],
  "currentBlockers": [],
  "actions": [
    { "kind": "send_message", "toAgentId": "agent-id-or-null", "messageType": "STATUS_UPDATE|HELP_REQUEST|TASK_OFFER|NEGOTIATION_PROPOSAL|ALERT", "subject": "...", "payload": {...}, "priority": 5 },
    { "kind": "propose_decision", "decisionType": "TASK_REASSIGNMENT|DEADLINE_EXTENSION|WORKLOAD_REBALANCE|BURNOUT_ALERT", "title": "...", "description": "...", "reasoning": "...", "confidence": 0.8, "actionPayload": {...}, "impactEstimate": {"deliveryChange": 5, "costChange": 0, "burnoutChange": -10} },
    { "kind": "no_action", "reason": "..." }
  ]
}

Available agent IDs for messages:
${agentProfiles.map(a => `- ${a.id} (${a.role}: ${a.name})`).join('\n')}

RULES: Be specific. Reference task #numbers and real names. 1-3 actions max. Autonomy=SUGGEST so all decisions need human approval.`

    try {
      const startTime = Date.now()
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        system: systemPrompt,
        prompt,
        temperature: 0.3,
        maxTokens: 3000,
      })
      const elapsed = Date.now() - startTime

      console.log(`   ⏱️  LLM responded in ${elapsed}ms`)

      // Parse response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.log(`   ⚠️  Failed to parse JSON. Raw output:`)
        console.log(`   ${text.substring(0, 300)}...`)
        allResults.push({ agent: agentProfile, reasoning: text, actions: [] })
        continue
      }

      const parsed = JSON.parse(jsonMatch[0])
      console.log(`   💭 Mood: ${parsed.mood}`)
      console.log(`   🎯 Goals: ${(parsed.activeGoals ?? []).join(', ')}`)
      console.log(`   📝 Reasoning: ${(parsed.reasoning ?? '').substring(0, 150)}...`)
      console.log(`   ⚡ Actions: ${(parsed.actions ?? []).length}`)

      // Process actions
      const actions = parsed.actions ?? []
      for (const action of actions) {
        if (action.kind === 'send_message') {
          const msg = await prisma.agentMessage.create({
            data: {
              projectId: project.id,
              fromAgentId: agentProfile.id,
              toAgentId: action.toAgentId === 'null' || !action.toAgentId ? null : action.toAgentId,
              messageType: action.messageType ?? 'STATUS_UPDATE',
              status: 'PENDING',
              priority: action.priority ?? 5,
              subject: action.subject ?? 'Update',
              payload: action.payload ?? {},
              reasoning: parsed.reasoning?.substring(0, 500),
              threadId: crypto.randomUUID(),
            },
          })
          const target = action.toAgentId
            ? agentProfiles.find(a => a.id === action.toAgentId)?.name ?? 'unknown'
            : 'ALL (broadcast)'
          console.log(`      📨 Message → ${target}: [${action.messageType}] "${action.subject}"`)
        } else if (action.kind === 'propose_decision') {
          const dec = await prisma.agentDecision.create({
            data: {
              projectId: project.id,
              agentId: agentProfile.id,
              decisionType: action.decisionType ?? 'WORKLOAD_REBALANCE',
              status: (action.confidence ?? 0.5) >= 0.85 ? 'APPROVED_BY_AGENT' : 'PROPOSED',
              title: action.title ?? 'Decision',
              description: action.description ?? '',
              reasoning: action.reasoning ?? parsed.reasoning ?? '',
              confidence: action.confidence ?? 0.5,
              actionPayload: action.actionPayload ?? {},
              impactEstimate: action.impactEstimate ?? {},
            },
          })
          console.log(`      📋 Decision: [${action.decisionType}] "${action.title}" (conf: ${((action.confidence ?? 0.5) * 100).toFixed(0)}%)`)
        } else if (action.kind === 'no_action') {
          console.log(`      💤 No action: ${action.reason}`)
        }
      }

      // Update agent state
      await prisma.agentProfile.update({
        where: { id: agentProfile.id },
        data: {
          currentState: {
            activeGoals: parsed.activeGoals ?? [],
            currentBlockers: parsed.currentBlockers ?? [],
            recentActions: actions.map((a: any) => ({ action: a.kind, timestamp: new Date().toISOString() })),
            mood: parsed.mood ?? 'idle',
            workloadAssessment: {
              assignedTasks: myActive.length,
              estimatedHoursRemaining: myActive.length * 8,
              capacityUtilization: teamSummary.find(m => m.userId === agentProfile.userId)?.utilization ?? 0,
              burnoutRisk: teamSummary.find(m => m.userId === agentProfile.userId)?.burnoutRisk ?? 0,
            },
          },
          memory: [{ timestamp: new Date().toISOString(), type: 'observation', content: parsed.reasoning?.substring(0, 200), importance: 5 }],
          lastRunAt: new Date(),
          totalInteractions: { increment: 1 },
        },
      })

      allResults.push({ agent: agentProfile, reasoning: parsed.reasoning, actions })
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`)
      allResults.push({ agent: agentProfile, reasoning: `Error: ${err.message}`, actions: [] })
    }
  }

  // ── Step 5: Report ─────────────────────────────────────────────
  console.log('\n' + '━'.repeat(60))
  console.log('📊 PHASE 3: Results Summary')
  console.log('━'.repeat(60))

  // Messages created
  const totalMessages = await prisma.agentMessage.count({ where: { projectId: project.id } })
  const messagesByType = await prisma.agentMessage.groupBy({
    by: ['messageType'],
    where: { projectId: project.id },
    _count: { id: true },
  })

  console.log(`\n📨 Messages Created: ${totalMessages}`)
  for (const m of messagesByType) {
    console.log(`   ${m.messageType}: ${m._count.id}`)
  }

  // Decisions created
  const totalDecisions = await prisma.agentDecision.count({ where: { projectId: project.id } })
  const decisionsByType = await prisma.agentDecision.groupBy({
    by: ['decisionType'],
    where: { projectId: project.id },
    _count: { id: true },
  })

  console.log(`\n📋 Decisions Proposed: ${totalDecisions}`)
  for (const d of decisionsByType) {
    console.log(`   ${d.decisionType}: ${d._count.id}`)
  }

  // List all decisions with details
  const allDecisions = await prisma.agentDecision.findMany({
    where: { projectId: project.id },
    include: { agent: true },
    orderBy: { createdAt: 'asc' },
  })

  if (allDecisions.length > 0) {
    console.log('\n📋 Decision Details:')
    for (const d of allDecisions) {
      const agentName = agentProfiles.find(a => a.id === d.agentId)?.name ?? 'unknown'
      console.log(`\n   ┌─ ${d.decisionType} (${d.status})`)
      console.log(`   │  Agent: ${d.agent.agentType} (${agentName})`)
      console.log(`   │  Title: ${d.title}`)
      console.log(`   │  Confidence: ${(d.confidence * 100).toFixed(0)}%`)
      console.log(`   │  Reasoning: ${d.reasoning.substring(0, 200)}`)
      console.log(`   │  Impact: ${JSON.stringify(d.impactEstimate)}`)
      console.log(`   └─ Action: ${JSON.stringify(d.actionPayload)}`)
    }
  }

  // ── Step 6: Simulate human review ──────────────────────────────
  const pendingDecisions = allDecisions.filter(d => d.status === 'PROPOSED' || d.status === 'APPROVED_BY_AGENT')
  if (pendingDecisions.length > 0) {
    console.log('\n' + '━'.repeat(60))
    console.log('👤 PHASE 4: Simulating Human Review')
    console.log('━'.repeat(60))

    for (let i = 0; i < pendingDecisions.length; i++) {
      const d = pendingDecisions[i]
      // Approve high-confidence, reject low-confidence
      const approved = d.confidence >= 0.6
      await prisma.agentDecision.update({
        where: { id: d.id },
        data: {
          status: approved ? 'APPROVED_BY_HUMAN' : 'REJECTED_BY_HUMAN',
          reviewedBy: 'test_reviewer',
          reviewedAt: new Date(),
          reviewNote: approved
            ? 'Looks good, approved during test'
            : 'Low confidence, rejected during test',
        },
      })

      // Update trust score
      const agent = await prisma.agentProfile.findUnique({ where: { id: d.agentId } })
      if (agent) {
        const newProposed = agent.decisionsProposed + 1
        const newAccepted = agent.decisionsAccepted + (approved ? 1 : 0)
        await prisma.agentProfile.update({
          where: { id: d.agentId },
          data: {
            decisionsProposed: newProposed,
            decisionsAccepted: newAccepted,
            trustScore: newProposed > 0 ? newAccepted / newProposed : 0.5,
          },
        })
      }

      const agentName = agentProfiles.find(a => a.id === d.agentId)?.name ?? 'unknown'
      console.log(`   ${approved ? '✅' : '❌'} ${d.title} (by ${agentName}, conf: ${(d.confidence * 100).toFixed(0)}%) → ${approved ? 'APPROVED' : 'REJECTED'}`)
    }
  }

  // ── Final Summary ──────────────────────────────────────────────
  console.log('\n' + '━'.repeat(60))
  console.log('🏁 FINAL AGENT STATE')
  console.log('━'.repeat(60))

  const finalAgents = await prisma.agentProfile.findMany({
    where: { projectId: project.id },
    orderBy: { agentType: 'asc' },
  })

  for (const a of finalAgents) {
    const name = agentProfiles.find(ap => ap.id === a.id)?.name ?? a.userId
    const state = a.currentState as any
    console.log(`\n   🤖 ${a.agentType} — ${name}`)
    console.log(`      Trust: ${(a.trustScore * 100).toFixed(0)}% | Runs: ${a.totalInteractions} | Proposed: ${a.decisionsProposed} | Accepted: ${a.decisionsAccepted}`)
    console.log(`      Mood: ${state?.mood ?? 'unknown'} | Goals: ${(state?.activeGoals ?? []).join(', ') || 'none'}`)
    console.log(`      Last run: ${a.lastRunAt?.toISOString() ?? 'never'}`)
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`✅ Test complete! ${totalMessages} messages, ${totalDecisions} decisions`)
  console.log(`   View the dashboard at: /projects/${project.id}/project-manager/agent-collaboration`)
  console.log('═'.repeat(60))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
