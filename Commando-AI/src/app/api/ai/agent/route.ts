import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai'
import { getProjectContext } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/_actions/context-actions'
import { createIssue, getProjectIssues, updateIssue, changeIssueStatus, assignIssue, archiveIssue } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/issues/_actions/issue-actions'
import { createSprint, getProjectSprints, getBacklogIssues, moveIssueToSprint, startSprint, completeSprint, updateSprint } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/sprints/_actions/sprint-actions'
import { getProjectDashboardData } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/dashboard/_actions/dashboard-actions'
import { getProjectMembers } from '@/app/(main)/(pages)/projects/[projectId]/project-manager/settings/team/_actions/team-actions'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })

// ==========================================
// TOOL DEFINITIONS (Gemini Function Declarations)
// ==========================================

const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'get_dashboard',
    description: 'Get full project dashboard data including issue stats, active sprint, board snapshot, backlog preview, timeline, recent activity, and team members.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'The project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_issues',
    description: 'Get all issues (tasks, bugs, stories, epics) in the project. Returns title, type, status, priority, assignee, and dates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'The project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_issue',
    description: 'Create a new issue/task in the project. Use this to add tasks, bugs, stories, epics, or subtasks to the kanban board or backlog.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'The project ID' },
        title: { type: Type.STRING, description: 'Issue title' },
        description: { type: Type.STRING, description: 'Detailed description (supports markdown)' },
        type: { type: Type.STRING, description: 'Issue type: EPIC, STORY, TASK, BUG, or SUBTASK', enum: ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'] },
        status: { type: Type.STRING, description: 'Initial status: TODO, IN_PROGRESS, IN_REVIEW, or DONE', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] },
        priority: { type: Type.STRING, description: 'Priority: LOW, MEDIUM, HIGH, or CRITICAL', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        assigneeId: { type: Type.STRING, description: 'User clerkId to assign to (optional)' },
        parentId: { type: Type.STRING, description: 'Parent issue ID for subtasks (optional)' },
      },
      required: ['projectId', 'title', 'type', 'priority'],
    },
  },
  {
    name: 'update_issue',
    description: 'Update an existing issue. Can change title, description, type, status, priority, assignee, or dates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        issueId: { type: Type.STRING, description: 'The issue ID to update' },
        title: { type: Type.STRING, description: 'New title' },
        description: { type: Type.STRING, description: 'New description' },
        type: { type: Type.STRING, enum: ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'] },
        status: { type: Type.STRING, enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] },
        priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      },
      required: ['issueId'],
    },
  },
  {
    name: 'change_issue_status',
    description: 'Change the status of an issue. Validates against workflow transitions.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        issueId: { type: Type.STRING, description: 'The issue ID' },
        status: { type: Type.STRING, description: 'New status', enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] },
      },
      required: ['issueId', 'status'],
    },
  },
  {
    name: 'assign_issue',
    description: 'Assign an issue to a team member or unassign it.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        issueId: { type: Type.STRING, description: 'The issue ID' },
        assigneeId: { type: Type.STRING, description: 'User clerkId to assign, or null to unassign' },
      },
      required: ['issueId'],
    },
  },
  {
    name: 'archive_issue',
    description: 'Archive an issue and its subtasks.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        issueId: { type: Type.STRING, description: 'The issue ID to archive' },
      },
      required: ['issueId'],
    },
  },
  {
    name: 'get_sprints',
    description: 'Get all sprints and their issues. Shows sprint status (PLANNED, ACTIVE, COMPLETED), goal, dates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'The project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_backlog',
    description: 'Get all issues that are not assigned to any sprint (the backlog).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'The project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'create_sprint',
    description: 'Create a new sprint for the project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'The project ID' },
        name: { type: Type.STRING, description: 'Sprint name (e.g., Sprint 1)' },
        goal: { type: Type.STRING, description: 'Sprint goal/objective' },
        startDate: { type: Type.STRING, description: 'Start date in ISO format (optional)' },
        endDate: { type: Type.STRING, description: 'End date in ISO format (optional)' },
      },
      required: ['projectId', 'name'],
    },
  },
  {
    name: 'update_sprint',
    description: 'Update sprint name, goal, or dates.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sprintId: { type: Type.STRING, description: 'The sprint ID' },
        name: { type: Type.STRING },
        goal: { type: Type.STRING },
        startDate: { type: Type.STRING },
        endDate: { type: Type.STRING },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'start_sprint',
    description: 'Start a planned sprint (changes status to ACTIVE). Only one sprint can be active at a time.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sprintId: { type: Type.STRING, description: 'The sprint ID to start' },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'complete_sprint',
    description: 'Complete the active sprint. Moves incomplete issues back to backlog.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sprintId: { type: Type.STRING, description: 'The sprint ID to complete' },
      },
      required: ['sprintId'],
    },
  },
  {
    name: 'move_issue_to_sprint',
    description: 'Move an issue into a sprint (from backlog or another sprint).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        issueId: { type: Type.STRING, description: 'The issue ID' },
        sprintId: { type: Type.STRING, description: 'The target sprint ID' },
      },
      required: ['issueId', 'sprintId'],
    },
  },
  {
    name: 'get_team_members',
    description: 'Get all project team members with their roles and department roles.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: { type: Type.STRING, description: 'The project ID' },
      },
      required: ['projectId'],
    },
  },
]

// ==========================================
// TOOL EXECUTOR
// ==========================================

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_dashboard':
      return await getProjectDashboardData(args.projectId as string)

    case 'get_issues':
      return await getProjectIssues(args.projectId as string)

    case 'create_issue':
      return await createIssue(args.projectId as string, {
        title: args.title as string,
        description: (args.description as string) || undefined,
        type: (args.type as 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK') || 'TASK',
        status: (args.status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE') || 'TODO',
        priority: (args.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') || 'MEDIUM',
        assigneeId: (args.assigneeId as string) || undefined,
        parentId: (args.parentId as string) || undefined,
      })

    case 'update_issue': {
      const updates: Record<string, unknown> = {}
      if (args.title) updates.title = args.title
      if (args.description) updates.description = args.description
      if (args.type) updates.type = args.type
      if (args.status) updates.status = args.status
      if (args.priority) updates.priority = args.priority
      return await updateIssue(args.issueId as string, updates)
    }

    case 'change_issue_status':
      return await changeIssueStatus(
        args.issueId as string,
        args.status as 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE'
      )

    case 'assign_issue':
      return await assignIssue(
        args.issueId as string,
        (args.assigneeId as string) || null
      )

    case 'archive_issue':
      return await archiveIssue(args.issueId as string)

    case 'get_sprints':
      return await getProjectSprints(args.projectId as string)

    case 'get_backlog':
      return await getBacklogIssues(args.projectId as string)

    case 'create_sprint':
      return await createSprint(args.projectId as string, {
        name: args.name as string,
        goal: (args.goal as string) || undefined,
        startDate: args.startDate ? new Date(args.startDate as string) : undefined,
        endDate: args.endDate ? new Date(args.endDate as string) : undefined,
      })

    case 'update_sprint': {
      const sprintUpdates: Record<string, unknown> = {}
      if (args.name) sprintUpdates.name = args.name
      if (args.goal) sprintUpdates.goal = args.goal
      if (args.startDate) sprintUpdates.startDate = new Date(args.startDate as string)
      if (args.endDate) sprintUpdates.endDate = new Date(args.endDate as string)
      return await updateSprint(args.sprintId as string, sprintUpdates)
    }

    case 'start_sprint':
      return await startSprint(args.sprintId as string)

    case 'complete_sprint':
      return await completeSprint(args.sprintId as string)

    case 'move_issue_to_sprint':
      return await moveIssueToSprint(args.issueId as string, args.sprintId as string)

    case 'get_team_members':
      return await getProjectMembers(args.projectId as string)

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ==========================================
// API ROUTE
// ==========================================

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, messages } = await req.json()

    if (!projectId || !messages?.length) {
      return NextResponse.json({ error: 'Missing projectId or messages' }, { status: 400 })
    }

    // Fetch project context
    const context = await getProjectContext(projectId)
    if (!context) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(context)

    // Convert messages to Gemini format
    const geminiHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1].content

    // Create chat with tools
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: geminiHistory,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations: toolDeclarations }],
      },
    })

    // Send message and handle tool calls in a loop
    let response = await chat.sendMessage({ message: lastMessage })

    // Agentic loop: keep executing tools until the model gives a text response
    let loopCount = 0
    const maxLoops = 15

    while (loopCount < maxLoops) {
      loopCount++

      // Check if the response has function calls
      const functionCalls = response.functionCalls
      if (!functionCalls || functionCalls.length === 0) break

      // Execute all function calls
      const functionResponses = []
      for (const fc of functionCalls) {
        console.log(`[AI Agent] Calling tool: ${fc.name}`, fc.args)
        try {
          const result = await executeTool(fc.name!, fc.args as Record<string, unknown>)
          functionResponses.push({
            name: fc.name!,
            response: result,
          })
        } catch (err) {
          console.error(`[AI Agent] Tool error: ${fc.name}`, err)
          functionResponses.push({
            name: fc.name!,
            response: { error: `Tool execution failed: ${(err as Error).message}` },
          })
        }
      }

      // Send tool results back to the model
      response = await chat.sendMessage({
        message: functionResponses.map((fr) => ({
          functionResponse: {
            name: fr.name,
            response: fr.response as Record<string, unknown>,
          },
        })),
      })
    }

    // Extract the final text response
    const textResponse = response.text || 'I completed the requested actions.'

    return NextResponse.json({
      message: textResponse,
      toolsUsed: loopCount > 0,
    })
  } catch (error) {
    console.error('[AI_AGENT]', error)
    return NextResponse.json(
      { error: 'AI agent failed. Please try again.' },
      { status: 500 }
    )
  }
}

// ==========================================
// SYSTEM PROMPT BUILDER
// ==========================================

function buildSystemPrompt(context: NonNullable<Awaited<ReturnType<typeof getProjectContext>>>) {
  const setup = context.setup
  const members = context.members

  return `You are the AI Project Management Assistant for "${context.name}" (key: ${context.key}).
You help the Project Manager automate and manage their project efficiently.

## PROJECT CONTEXT
- **Name:** ${context.name}
- **Key:** ${context.key}
- **Description:** ${context.description || 'No description'}
- **Project ID:** ${context.id}
- **Created:** ${context.createdAt}
- **Total Issues:** ${context.totalIssues}
- **Total Sprints:** ${context.totalSprints}

${setup ? `## PROJECT SETUP
- **Timeline:** ${setup.startDate || 'Not set'} → ${setup.endDate || 'Not set'}
- **Team Size:** ${setup.teamSize || 'Not specified'}
- **Tech Stack:** ${setup.techStack || 'Not specified'}
- **Vision:** ${setup.vision || 'Not specified'}
- **AI Instructions:** ${setup.aiInstructions || 'None'}
${setup.githubRepoUrl ? `- **GitHub:** ${setup.githubRepoUrl}` : ''}` : ''}

## TEAM MEMBERS
${members.length > 0
    ? members.map((m) => `- ${m.name || m.email} (${m.departmentRole || m.role}) — userId: ${m.userId}`).join('\n')
    : 'No members yet'}

## YOUR CAPABILITIES
You can use tools to:
1. **Issues**: Create, update, assign, change status, archive issues. Types: EPIC, STORY, TASK, BUG, SUBTASK. Statuses: TODO, IN_PROGRESS, IN_REVIEW, DONE. Priorities: LOW, MEDIUM, HIGH, CRITICAL.
2. **Sprints**: Create, start, complete sprints. Move issues into sprints.
3. **Kanban Board**: The board shows issues by status columns (TODO → IN_PROGRESS → IN_REVIEW → DONE). Creating issues with appropriate statuses populates the board.
4. **Backlog**: View unassigned-to-sprint issues.
5. **Dashboard**: Get project overview stats.
6. **Team**: View team members and their roles.

## IMPORTANT RULES
- When creating tasks for the kanban board, create them as issues with type TASK (or STORY/BUG as appropriate) and status TODO.
- Always use the project ID "${context.id}" when calling project-level tools.
- When the PM asks to "set up the board" or "create tasks", generate a comprehensive set of issues based on the project context (tech stack, vision, etc.).
- Break down work into EPICs → STORYs → TASKs hierarchy when appropriate.
- Assign appropriate priorities based on task importance.
- When creating multiple issues, batch them logically and inform the PM of what was created.
- Be proactive: suggest sprint planning, task breakdowns, and team assignments.
- Format responses clearly with markdown. Use bullet points and headers.
- When you create issues, tell the PM the title and type of each one created.
- If you don't have enough context, ask clarifying questions before taking action.
- ALWAYS call tools when the user asks you to create, update, or manage anything. Don't just describe what you would do.`
}
