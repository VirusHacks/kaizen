// ==========================================
// Inngest Functions — Agent Orchestration
// ==========================================
// These functions are triggered by events and handle
// the core agent thinking loop, message routing,
// and planning cycles.

import { inngest } from './client'
import { db } from '@/lib/db'
import { getAgent } from '@/lib/agents/factory'
import { buildAgentContext } from '@/lib/agents/context-builder'
import { processThinkResult, getProjectAgents, expireOldMessages } from '@/lib/agents/message-bus'

// ==========================================
// 1. Agent Think Cycle
// ==========================================
// Triggered per-agent on schedule or by events.

export const agentThink = inngest.createFunction(
  {
    id: 'agent-think',
    name: 'Agent Think Cycle',
    throttle: {
      key: 'event.data.agentId',
      limit: 1,
      period: '30s', // Max once per 30s per agent
    },
    retries: 2,
  },
  { event: 'agent/think' },
  async ({ event, step }) => {
    const { agentId, projectId } = event.data

    // Step 1: Load agent profile
    const agent = await step.run('load-agent', async () => {
      return db.agentProfile.findUnique({
        where: { id: agentId },
      })
    })

    if (!agent || agent.status !== 'ACTIVE') {
      return { status: 'skipped', reason: 'Agent not found or inactive' }
    }

    // Step 2: Build context
    const context = await step.run('build-context', async () => {
      return buildAgentContext(agentId)
    })

    // Step 3: Think (call LLM)
    const thinkResult = await step.run('think', async () => {
      const agentImpl = getAgent(agent.agentType)
      return agentImpl.think(context)
    })

    // Step 4: Process results (persist messages, decisions, state)
    const { messageIds, decisionIds } = await step.run('process-results', async () => {
      return processThinkResult(agentId, projectId, thinkResult)
    })

    // Step 5: Fan-out — trigger think cycles for agents who received messages
    if (messageIds.length > 0) {
      await step.run('fan-out-messages', async () => {
        const messages = await db.agentMessage.findMany({
          where: { id: { in: messageIds } },
          select: { toAgentId: true },
        })

        const events = []
        for (const msg of messages) {
          if (msg.toAgentId) {
            // Direct message: wake up the recipient
            events.push({
              name: 'agent/think' as const,
              data: { agentId: msg.toAgentId, projectId, trigger: 'message_received' as const },
            })
          }
        }

        // Deduplicate
        const uniqueEvents = events.filter(
          (e, i, arr) => arr.findIndex(x => x.data.agentId === e.data.agentId) === i
        )

        if (uniqueEvents.length > 0) {
          await inngest.send(uniqueEvents)
        }
      })
    }

    return {
      status: 'completed',
      agentType: agent.agentType,
      actionsCount: thinkResult.actions.length,
      messagesSent: messageIds.length,
      decisionsProposed: decisionIds.length,
      reasoning: thinkResult.reasoning.substring(0, 200),
    }
  }
)

// ==========================================
// 2. Planning Cycle — Runs all agents in sequence
// ==========================================
// Triggered manually or on schedule. Runs optimizer
// first, then manager, then all developers.

export const planningCycle = inngest.createFunction(
  {
    id: 'planning-cycle',
    name: 'Full Planning Cycle',
    throttle: {
      key: 'event.data.projectId',
      limit: 1,
      period: '2m', // Max once per 2 min per project
    },
    retries: 1,
  },
  { event: 'agent/planning.cycle' },
  async ({ event, step }) => {
    const { projectId } = event.data

    // Step 1: Cleanup old messages
    await step.run('cleanup', async () => {
      return expireOldMessages(projectId, 48)
    })

    // Step 2: Get all agents
    const agents = await step.run('get-agents', async () => {
      return getProjectAgents(projectId)
    })

    const optimizer = agents.find((a: { agentType: string }) => a.agentType === 'OPTIMIZER')
    const manager = agents.find((a: { agentType: string }) => a.agentType === 'MANAGER')
    const developers = agents.filter((a: { agentType: string }) => a.agentType === 'DEVELOPER')

    // Step 3: Run optimizer first (gets the big picture)
    if (optimizer) {
      await step.run('run-optimizer', async () => {
        const ctx = await buildAgentContext(optimizer.id)
        const agentImpl = getAgent('OPTIMIZER')
        const result = await agentImpl.think(ctx)
        await processThinkResult(optimizer.id, projectId, result)
        return { actions: result.actions.length }
      })
    }

    // Step 4: Run manager (processes optimizer's output)
    if (manager) {
      await step.run('run-manager', async () => {
        const ctx = await buildAgentContext(manager.id)
        const agentImpl = getAgent('MANAGER')
        const result = await agentImpl.think(ctx)
        await processThinkResult(manager.id, projectId, result)
        return { actions: result.actions.length }
      })
    }

    // Step 5: Run all developer agents
    const devResults = []
    for (const dev of developers) {
      const devResult = await step.run(`run-dev-${dev.id.slice(0, 8)}`, async () => {
        const ctx = await buildAgentContext(dev.id)
        const agentImpl = getAgent('DEVELOPER')
        const result = await agentImpl.think(ctx)
        await processThinkResult(dev.id, projectId, result)
        return { userId: dev.userId, actions: result.actions.length }
      })
      devResults.push(devResult)
    }

    return {
      status: 'completed',
      agentCount: agents.length,
      optimizerRan: !!optimizer,
      managerRan: !!manager,
      developersRan: devResults.length,
    }
  }
)

// ==========================================
// 3. Scheduled Agent Heartbeat
// ==========================================
// Runs every 10 minutes. Checks which agents are
// due for their next run and triggers think cycles.

export const agentHeartbeat = inngest.createFunction(
  {
    id: 'agent-heartbeat',
    name: 'Agent Heartbeat',
    retries: 1,
  },
  { cron: '*/10 * * * *' }, // Every 10 minutes
  async ({ step }) => {
    // Find all agents that are due for a run
    const dueAgents = await step.run('find-due-agents', async () => {
      const now = new Date()
      return db.agentProfile.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { lastRunAt: null },
            { lastRunAt: { lt: new Date(now.getTime() - 10 * 60 * 1000) } },
          ],
        },
        select: { id: true, projectId: true },
        take: 50,
      }) as Promise<{ id: string; projectId: string }[]>
    })

    if (dueAgents.length === 0) {
      return { status: 'no-agents-due' }
    }

    // Send think events for each due agent
    await step.run('trigger-agents', async () => {
      const events = dueAgents.map(a => ({
        name: 'agent/think' as const,
        data: {
          agentId: a.id,
          projectId: a.projectId,
          trigger: 'scheduled' as const,
        },
      }))
      await inngest.send(events)
    })

    return { status: 'triggered', count: dueAgents.length }
  }
)

// Export all functions for the serve handler
export const inngestFunctions = [agentThink, planningCycle, agentHeartbeat]
