#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerProjectTools } from './tools/project.js'
import { registerTaskTools } from './tools/tasks.js'
import { registerSprintTools } from './tools/sprints.js'
import { registerWorkflowTools } from './tools/workflow.js'
import { registerAITools } from './tools/ai.js'
import { registerProductivityTools } from './tools/productivity.js'

const server = new McpServer({
  name: 'commando-ai',
  version: '1.0.0',
})

// Register all tool groups
registerProjectTools(server)
registerTaskTools(server)
registerSprintTools(server)
registerWorkflowTools(server)
registerAITools(server)
registerProductivityTools(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('🚀 Commando-AI MCP server running on stdio')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
