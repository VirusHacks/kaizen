// ==========================================
// Agent System — Public API
// ==========================================

export { getAgent } from './factory'
export { buildAgentContext, defaultAgentState } from './context-builder'
export {
  sendAgentMessage,
  acknowledgeMessage,
  expireOldMessages,
  proposeDecision,
  reviewDecision,
  processThinkResult,
  getProjectAgents,
  ensureProjectAgents,
} from './message-bus'
export { DeveloperAgent } from './developer-agent'
export { ManagerAgent } from './manager-agent'
export { OptimizerAgent } from './optimizer-agent'
export type * from './types'
