import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';

export function registerProductivityTools(server: McpServer) {
  // ─── Get developer stats (personal dashboard) ───
  server.tool(
    'get_my_stats',
    'Get your personal stats for a project: tasks by status, priority breakdown, completion rate, and active sprint info.',
    {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('Clerk user ID'),
    },
    async ({ projectId, userId }) => {
      const [
        total,
        todo,
        inProgress,
        inReview,
        done,
        critical,
        high,
        bugs,
        overdue,
      ] = await Promise.all([
        db.issue.count({
          where: { projectId, assigneeId: userId, isArchived: false },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            status: 'TODO',
          },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            status: 'IN_PROGRESS',
          },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            status: 'IN_REVIEW',
          },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            status: 'DONE',
          },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            priority: 'CRITICAL',
          },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            priority: 'HIGH',
          },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            type: 'BUG',
          },
        }),
        db.issue.count({
          where: {
            projectId,
            assigneeId: userId,
            isArchived: false,
            status: { not: 'DONE' },
            dueDate: { lt: new Date() },
          },
        }),
      ]);

      const activeSprint = await db.sprint.findFirst({
        where: { projectId, status: 'ACTIVE' },
        select: {
          name: true,
          endDate: true,
          _count: {
            select: {
              issues: { where: { assigneeId: userId, isArchived: false } },
            },
          },
          issues: {
            where: { assigneeId: userId, isArchived: false },
            select: { status: true },
          },
        },
      });

      const sprintInfo = activeSprint
        ? {
            name: activeSprint.name,
            endDate: activeSprint.endDate?.toISOString() || null,
            daysRemaining: activeSprint.endDate
              ? Math.ceil(
                  (activeSprint.endDate.getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                )
              : null,
            myTasks: activeSprint._count.issues,
            myDone: activeSprint.issues.filter(
              (i: { status: string }) => i.status === 'DONE',
            ).length,
          }
        : null;

      const result = {
        total,
        byStatus: { todo, inProgress, inReview, done },
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
        urgentItems: { critical, high, bugs, overdue },
        activeSprint: sprintInfo,
      };

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    },
  );

  // ─── Generate standup summary ───
  server.tool(
    'generate_standup',
    'Generate a daily standup summary: what was done recently, what you are working on, and blockers. Based on your assigned tasks and recent status changes.',
    {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('Clerk user ID'),
    },
    async ({ projectId, userId }) => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Recently completed (done within last 24h)
      const recentlyDone = await db.issue.findMany({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: 'DONE',
          updatedAt: { gte: oneDayAgo },
        },
        select: {
          number: true,
          title: true,
          type: true,
          project: { select: { key: true } },
        },
      });

      // Currently in progress
      const inProgress = await db.issue.findMany({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: 'IN_PROGRESS',
        },
        select: {
          number: true,
          title: true,
          type: true,
          priority: true,
          project: { select: { key: true } },
        },
      });

      // In review
      const inReview = await db.issue.findMany({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: 'IN_REVIEW',
        },
        select: {
          number: true,
          title: true,
          type: true,
          project: { select: { key: true } },
        },
      });

      // Blocked / overdue
      const overdue = await db.issue.findMany({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: { not: 'DONE' },
          dueDate: { lt: now },
        },
        select: {
          number: true,
          title: true,
          dueDate: true,
          project: { select: { key: true } },
        },
      });

      // Critical items
      const critical = await db.issue.findMany({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: { not: 'DONE' },
          priority: 'CRITICAL',
        },
        select: {
          number: true,
          title: true,
          project: { select: { key: true } },
        },
      });

      const fmt = (i: {
        number: number;
        title: string;
        project: { key: string };
      }) => `${i.project.key}-${i.number}: ${i.title}`;

      const standup = {
        date: now.toISOString().split('T')[0],
        yesterday:
          recentlyDone.length > 0
            ? recentlyDone.map(fmt)
            : ['No tasks completed in the last 24 hours'],
        today:
          inProgress.length > 0
            ? inProgress.map(fmt)
            : ['No tasks currently in progress'],
        inReview: inReview.map(fmt),
        blockers: [
          ...overdue.map(
            (i: {
              number: number;
              title: string;
              dueDate: Date | null;
              project: { key: string };
            }) =>
              `OVERDUE: ${fmt(i)} (due ${i.dueDate?.toISOString().split('T')[0]})`,
          ),
          ...critical.map(
            (i: { number: number; title: string; project: { key: string } }) =>
              `CRITICAL: ${fmt(i)}`,
          ),
        ],
      };

      // Format as readable text
      let text = `## Daily Standup — ${standup.date}\n\n`;
      text += `### ✅ Yesterday (Done)\n${standup.yesterday.map((t: string) => `- ${t}`).join('\n')}\n\n`;
      text += `### 🔨 Today (In Progress)\n${standup.today.map((t: string) => `- ${t}`).join('\n')}\n\n`;
      if (standup.inReview.length > 0) {
        text += `### 👀 In Review\n${standup.inReview.map((t: string) => `- ${t}`).join('\n')}\n\n`;
      }
      if (standup.blockers.length > 0) {
        text += `### 🚨 Blockers / Risks\n${standup.blockers.map((t: string) => `- ${t}`).join('\n')}\n`;
      } else {
        text += `### 🚨 Blockers\n- None\n`;
      }

      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );

  // ─── Get suggested branch name for a task ───
  server.tool(
    'get_branch_name',
    'Generate a git branch name for a task following conventions. E.g., feature/PROJ-123-add-user-auth. Use when creating a branch to work on a task.',
    { issueId: z.string().describe('Issue/task ID') },
    async ({ issueId }) => {
      const issue = await db.issue.findUnique({
        where: { id: issueId },
        select: {
          number: true,
          title: true,
          type: true,
          project: { select: { key: true } },
        },
      });

      if (!issue) {
        return {
          content: [{ type: 'text' as const, text: 'Task not found' }],
          isError: true,
        };
      }

      const prefix =
        issue.type === 'BUG'
          ? 'bugfix'
          : issue.type === 'EPIC'
            ? 'epic'
            : 'feature';

      const slug = issue.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 40)
        .replace(/-$/, '');

      const branch = `${prefix}/${issue.project.key}-${issue.number}-${slug}`;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                branch,
                gitCommand: `git checkout -b ${branch}`,
                task: `${issue.project.key}-${issue.number}: ${issue.title}`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── Get commit message template ───
  server.tool(
    'get_commit_message',
    'Generate a conventional commit message for a task. Includes the task key in the format: type(scope): description [PROJ-123]',
    {
      issueId: z.string().describe('Issue/task ID'),
      changeDescription: z
        .string()
        .describe('Brief description of what changed'),
      commitType: z
        .enum([
          'feat',
          'fix',
          'refactor',
          'docs',
          'test',
          'chore',
          'style',
          'perf',
        ])
        .default('feat')
        .describe('Conventional commit type'),
    },
    async ({ issueId, changeDescription, commitType }) => {
      const issue = await db.issue.findUnique({
        where: { id: issueId },
        select: {
          number: true,
          title: true,
          type: true,
          project: { select: { key: true } },
        },
      });

      if (!issue) {
        return {
          content: [{ type: 'text' as const, text: 'Task not found' }],
          isError: true,
        };
      }

      const key = `${issue.project.key}-${issue.number}`;
      const message = `${commitType}: ${changeDescription} [${key}]`;
      const fullMessage = `${commitType}: ${changeDescription} [${key}]\n\nResolves: ${key}\nTask: ${issue.title}`;

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                short: message,
                full: fullMessage,
                gitCommand: `git commit -m "${message}"`,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── Get urgent/next tasks to work on ───
  server.tool(
    'get_next_task',
    'Get the next most important task to work on. Prioritizes by: overdue > critical > high priority > sprint tasks > others. Helps decide what to pick up next.',
    {
      projectId: z.string().describe('Project ID'),
      userId: z.string().describe('Clerk user ID'),
    },
    async ({ projectId, userId }) => {
      // Check for overdue tasks first
      const overdue = await db.issue.findFirst({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
        },
        include: {
          project: { select: { key: true } },
          sprint: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      if (overdue) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  reason: '⚠️ OVERDUE — This task is past its due date!',
                  task: {
                    id: overdue.id,
                    key: `${overdue.project.key}-${overdue.number}`,
                    title: overdue.title,
                    type: overdue.type,
                    status: overdue.status,
                    priority: overdue.priority,
                    dueDate: overdue.dueDate?.toISOString(),
                    sprint: overdue.sprint?.name || null,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Then critical/high priority in active sprint
      const urgent = await db.issue.findFirst({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          priority: { in: ['CRITICAL', 'HIGH'] },
          sprint: { status: 'ACTIVE' },
        },
        include: {
          project: { select: { key: true } },
          sprint: { select: { name: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      if (urgent) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  reason: `🔴 ${urgent.priority} priority in active sprint`,
                  task: {
                    id: urgent.id,
                    key: `${urgent.project.key}-${urgent.number}`,
                    title: urgent.title,
                    type: urgent.type,
                    status: urgent.status,
                    priority: urgent.priority,
                    sprint: urgent.sprint?.name || null,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Then any task in active sprint
      const sprintTask = await db.issue.findFirst({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: 'TODO',
          sprint: { status: 'ACTIVE' },
        },
        include: {
          project: { select: { key: true } },
          sprint: { select: { name: true } },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      if (sprintTask) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  reason: '📋 Next TODO in active sprint',
                  task: {
                    id: sprintTask.id,
                    key: `${sprintTask.project.key}-${sprintTask.number}`,
                    title: sprintTask.title,
                    type: sprintTask.type,
                    status: sprintTask.status,
                    priority: sprintTask.priority,
                    sprint: sprintTask.sprint?.name || null,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // Finally, any TODO task
      const anyTask = await db.issue.findFirst({
        where: {
          projectId,
          assigneeId: userId,
          isArchived: false,
          status: 'TODO',
        },
        include: { project: { select: { key: true } } },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });

      if (anyTask) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  reason: '📌 Next TODO task by priority',
                  task: {
                    id: anyTask.id,
                    key: `${anyTask.project.key}-${anyTask.number}`,
                    title: anyTask.title,
                    type: anyTask.type,
                    priority: anyTask.priority,
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: '🎉 All tasks are done or in review! No pending TODO tasks.',
          },
        ],
      };
    },
  );
}
