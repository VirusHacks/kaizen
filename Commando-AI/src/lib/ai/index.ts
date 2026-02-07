// AI Service Layer - Main Export
// This module provides all AI capabilities for the application

// Types and Schemas
export * from './ai.types'

// Client
export { geminiClient, GeminiClient } from './gemini.client'

// Prompt Builders
export * from './prompt.builder'

// Server Actions
export {
  generateTasksWithAI,
  suggestTaskAssignee,
  planSprintWithAI,
  suggestTimelineWithAI,
  generateProjectSummary,
} from './ai.actions'
