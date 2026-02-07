import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { db } from '../db.js'

export function registerSprintTools(server: McpServer) {
  // ─── Get all sprints ───
  server.tool(
    'get_sprints',
    'List all sprints in a project with their status, dates, and issue counts.',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const sprints = await db.sprint.findMany({
        where: { projectId },
        include: {
          _count: { select: { issues: true } },
          issues: {
            where: { isArchived: false },
            select: { status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const result = sprints.map((s) => ({
        id: s.id,
        name: s.name,
        goal: s.goal,
        status: s.status,
        startDate: s.startDate?.toISOString() || null,
        endDate: s.endDate?.toISOString() || null,
        totalIssues: s._count.issues,
        progress: {
          todo: s.issues.filter((i) => i.status === 'TODO').length,
          inProgress: s.issues.filter((i) => i.status === 'IN_PROGRESS').length,
          inReview: s.issues.filter((i) => i.status === 'IN_REVIEW').length,
          done: s.issues.filter((i) => i.status === 'DONE').length,
        },
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // ─── Get active sprint details ───
  server.tool(
    'get_active_sprint',
    'Get the currently active sprint with its tasks and progress. Shows you what needs to be done before the sprint ends.',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const sprint = await db.sprint.findFirst({
        where: { projectId, status: 'ACTIVE' },
        include: {
          issues: {
            where: { isArchived: false },
            include: {
              assignee: { select: { name: true, clerkId: true } },
              project: { select: { key: true } },
            },
            orderBy: [{ status: 'asc' }, { priority: 'desc' }],
          },
        },
      })

      if (!sprint) {
        return { content: [{ type: 'text' as const, text: 'No active sprint found' }] }
      }

      const daysRemaining = sprint.endDate
        ? Math.ceil((sprint.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      const result = {
        id: sprint.id,
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate?.toISOString() || null,
        endDate: sprint.endDate?.toISOString() || null,
        daysRemaining,
        issues: sprint.issues.map((i) => ({
          id: i.id,
          key: `${i.project.key}-${i.number}`,
          title: i.title,
          type: i.type,
          status: i.status,
          priority: i.priority,
          assignee: i.assignee?.name || 'Unassigned',
          assigneeId: i.assignee?.clerkId || null,
        })),
        progress: {
          total: sprint.issues.length,
          done: sprint.issues.filter((i) => i.status === 'DONE').length,
          completionRate: sprint.issues.length > 0
            ? Math.round((sprint.issues.filter((i) => i.status === 'DONE').length / sprint.issues.length) * 100)
            : 0,
        },
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )

  // ─── Get backlog (unassigned to sprint) ───
  server.tool(
    'get_backlog',
    'Get all issues not assigned to any sprint (the backlog). Useful for finding unplanned work.',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const issues = await db.issue.findMany({
        where: { projectId, sprintId: null, isArchived: false },
        select: {
          id: true, number: true, title: true, type: true, status: true, priority: true,
          assignee: { select: { name: true } },
          project: { select: { key: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      })

      const result = issues.map((i) => ({
        id: i.id,
        key: `${i.project.key}-${i.number}`,
        title: i.title,
        type: i.type,
        status: i.status,
        priority: i.priority,
        assignee: i.assignee?.name || 'Unassigned',
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    }
  )
}
