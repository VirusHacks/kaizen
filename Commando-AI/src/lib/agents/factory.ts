// ==========================================
// Agent Factory
// ==========================================
// Returns the right agent implementation based on type.

import type { AgentType } from '@prisma/client'
import { BaseAgent } from './base-agent'
import { DeveloperAgent } from './developer-agent'
import { ManagerAgent } from './manager-agent'
import { OptimizerAgent } from './optimizer-agent'

const agents: Record<string, BaseAgent> = {
  DEVELOPER: new DeveloperAgent(),
  MANAGER: new ManagerAgent(),
  OPTIMIZER: new OptimizerAgent(),
}

export function getAgent(type: AgentType): BaseAgent {
  const agent = agents[type]
  if (!agent) {
    // Default to developer for unknown types
    return agents.DEVELOPER
  }
  return agent
}
