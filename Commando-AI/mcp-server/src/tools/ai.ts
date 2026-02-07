import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { db } from '../db.js'
import { GoogleGenAI } from '@google/genai'

function getGemini() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set in .env')
  return new GoogleGenAI({ apiKey: key })
}

export function registerAITools(server: McpServer) {
  // ─── Generate implementation plan for a task ───
  server.tool(
    'generate_implementation_plan',
    'Generate a step-by-step implementation plan for a task using AI. Returns architecture steps, file changes, database setup, integration steps, and testing plan. Use this before starting a complex task.',
    {
      issueId: z.string().describe('Issue/task ID to generate plan for'),
    },
    async ({ issueId }) => {
      const issue = await db.issue.findUnique({
        where: { id: issueId },
        include: {
          parent: { select: { title: true, description: true, type: true } },
          project: {
            select: {
              name: true, key: true,
              setup: { select: { techStack: true, vision: true, aiInstructions: true } },
            },
          },
        },
      })

      if (!issue) {
        return { content: [{ type: 'text' as const, text: 'Task not found' }], isError: true }
      }

      const ai = getGemini()

      const systemPrompt = `You are a senior software engineer generating an implementation plan for a developer.

## PROJECT CONTEXT
- **Project:** ${issue.project.name} (${issue.project.key})
- **Tech Stack:** ${issue.project.setup?.techStack || 'Not specified'}
- **Vision:** ${issue.project.setup?.vision || 'Not specified'}
${issue.project.setup?.aiInstructions ? `- **Coding Standards:** ${issue.project.setup.aiInstructions}` : ''}

Respond with a JSON object (no markdown fences):
{
  "summary": "1-2 sentence overview",
  "estimatedTime": "e.g., 2-4 hours",
  "suggestedBranch": "e.g., feature/PROJ-123-add-auth",
  "acceptanceCriteria": ["Criterion 1", "Criterion 2"],
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description",
      "category": "architecture|file_changes|database|integration|testing",
      "files": ["src/path/to/file.ts"],
      "commands": ["npm install package"]
    }
  ]
}

Rules:
- 4-8 concrete, actionable steps (15-30 min each)
- Include specific file paths for the tech stack
- Include terminal commands where relevant
- Be specific to the project tech stack
- For bugs, include reproduction and regression test steps
- suggestedBranch should follow git conventions`

      const userPrompt = `Generate an implementation plan for this ${issue.type}:

**Key:** ${issue.project.key}-${issue.number}
**Title:** ${issue.title}
${issue.description ? `**Description:** ${issue.description}` : ''}
${issue.parent ? `**Parent ${issue.parent.type}:** ${issue.parent.title}\n${issue.parent.description ? `**Parent Description:** ${issue.parent.description}` : ''}` : ''}`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature: 0.7 },
      })

      const text = response.text || ''

      let plan
      try {
        plan = JSON.parse(text)
      } catch {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (jsonMatch) {
          plan = JSON.parse(jsonMatch[1].trim())
        } else {
          const start = text.indexOf('{')
          const end = text.lastIndexOf('}')
          if (start !== -1 && end !== -1) {
            plan = JSON.parse(text.slice(start, end + 1))
          } else {
            return { content: [{ type: 'text' as const, text: `AI response could not be parsed:\n${text}` }], isError: true }
          }
        }
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(plan, null, 2) }],
      }
    }
  )

  // ─── Ask about the codebase / project ───
  server.tool(
    'ask_project_question',
    'Ask a question about the project, its architecture, or a specific task. The AI uses project context, tech stack, and coding standards to answer. Great for "how should I implement X?" questions.',
    {
      projectId: z.string().describe('Project ID'),
      question: z.string().describe('Your question about the project or implementation'),
      issueId: z.string().optional().describe('Optional: related issue ID for more context'),
    },
    async ({ projectId, question, issueId }) => {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          setup: true,
          _count: { select: { issues: true, sprints: true, members: true } },
        },
      })

      if (!project) {
        return { content: [{ type: 'text' as const, text: 'Project not found' }], isError: true }
      }

      let issueContext = ''
      if (issueId) {
        const issue = await db.issue.findUnique({
          where: { id: issueId },
          include: {
            parent: { select: { title: true, description: true } },
            children: { where: { isArchived: false }, select: { title: true, status: true } },
          },
        })
        if (issue) {
          issueContext = `\n\n## RELATED TASK
- **${project.key}-${issue.number}:** ${issue.title} (${issue.type}, ${issue.status})
${issue.description ? `- **Description:** ${issue.description}` : ''}
${issue.parent ? `- **Parent:** ${issue.parent.title}` : ''}
${issue.children.length > 0 ? `- **Subtasks:** ${issue.children.map((c) => `${c.title} (${c.status})`).join(', ')}` : ''}`
        }
      }

      const ai = getGemini()

      const systemPrompt = `You are a senior software engineer helping a developer working on the "${project.name}" project.

## PROJECT CONTEXT
- **Tech Stack:** ${project.setup?.techStack || 'Not specified'}
- **Vision:** ${project.setup?.vision || 'Not specified'}
${project.setup?.aiInstructions ? `- **Coding Standards:** ${project.setup.aiInstructions}` : ''}
- **Stats:** ${project._count.issues} issues, ${project._count.sprints} sprints, ${project._count.members} members
${project.setup?.githubRepoUrl ? `- **GitHub:** ${project.setup.githubRepoUrl}` : ''}${issueContext}

Answer concisely and specifically for this project's tech stack. Give code examples when helpful.`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: question,
        config: { systemInstruction: systemPrompt, temperature: 0.5 },
      })

      return {
        content: [{ type: 'text' as const, text: response.text || 'No response generated' }],
      }
    }
  )

  // ─── Generate test cases for a task ───
  server.tool(
    'generate_test_cases',
    'Generate test cases for a task based on its description and acceptance criteria. Returns test scenarios with expected behavior.',
    { issueId: z.string().describe('Issue/task ID') },
    async ({ issueId }) => {
      const issue = await db.issue.findUnique({
        where: { id: issueId },
        include: {
          parent: { select: { title: true, description: true } },
          project: {
            select: {
              name: true, key: true,
              setup: { select: { techStack: true } },
            },
          },
        },
      })

      if (!issue) {
        return { content: [{ type: 'text' as const, text: 'Task not found' }], isError: true }
      }

      const ai = getGemini()

      const prompt = `Generate test cases for this ${issue.type} in a ${issue.project.setup?.techStack || 'web'} project:

**Title:** ${issue.title}
${issue.description ? `**Description:** ${issue.description}` : ''}
${issue.parent ? `**Parent story:** ${issue.parent.title} — ${issue.parent.description || ''}` : ''}

Return a JSON array of test cases:
[
  {
    "id": "TC-1",
    "title": "Test title",
    "type": "unit|integration|e2e",
    "steps": ["Step 1", "Step 2"],
    "expected": "Expected behavior",
    "priority": "high|medium|low"
  }
]

Include positive cases, negative cases, and edge cases. No markdown fences, just JSON.`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.5 },
      })

      const text = response.text || '[]'
      let testCases
      try {
        testCases = JSON.parse(text)
      } catch {
        const match = text.match(/\[[\s\S]*\]/)
        testCases = match ? JSON.parse(match[0]) : text
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(testCases, null, 2) }],
      }
    }
  )

  // ─── Review code against acceptance criteria ───
  server.tool(
    'check_acceptance_criteria',
    'Given a task, generate a checklist of acceptance criteria and review points to verify before marking the task as done.',
    { issueId: z.string().describe('Issue/task ID') },
    async ({ issueId }) => {
      const issue = await db.issue.findUnique({
        where: { id: issueId },
        include: {
          parent: { select: { title: true, description: true } },
          children: {
            where: { isArchived: false },
            select: { title: true, status: true, type: true },
          },
          project: {
            select: {
              name: true,
              setup: { select: { techStack: true, aiInstructions: true } },
            },
          },
        },
      })

      if (!issue) {
        return { content: [{ type: 'text' as const, text: 'Task not found' }], isError: true }
      }

      const ai = getGemini()

      const prompt = `Generate an acceptance criteria checklist for this ${issue.type}:

**Title:** ${issue.title}
${issue.description ? `**Description:** ${issue.description}` : ''}
${issue.parent ? `**Parent:** ${issue.parent.title} — ${issue.parent.description || ''}` : ''}
${issue.children.length > 0 ? `**Subtasks:** ${issue.children.map((c) => `${c.title} (${c.status})`).join(', ')}` : ''}
**Tech Stack:** ${issue.project.setup?.techStack || 'web'}
${issue.project.setup?.aiInstructions ? `**Standards:** ${issue.project.setup.aiInstructions}` : ''}

Return JSON (no fences):
{
  "criteria": [
    { "id": 1, "description": "What to verify", "category": "functionality|performance|security|ui|accessibility" }
  ],
  "reviewPoints": ["Code review point 1", "Point 2"],
  "regressionRisks": ["Area that might break"]
}`

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { temperature: 0.4 },
      })

      const text = response.text || '{}'
      let checklist
      try {
        checklist = JSON.parse(text)
      } catch {
        const start = text.indexOf('{')
        const end = text.lastIndexOf('}')
        checklist = start !== -1 && end !== -1 ? JSON.parse(text.slice(start, end + 1)) : text
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(checklist, null, 2) }],
      }
    }
  )
}
