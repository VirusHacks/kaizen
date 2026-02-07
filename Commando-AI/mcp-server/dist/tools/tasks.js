import { z } from 'zod';
import { db } from '../db.js';
export function registerTaskTools(server) {
    // ─── Get my assigned tasks ───
    server.tool('get_my_tasks', 'Get all tasks assigned to you in a project. Returns task key, title, type, status, priority, sprint, and description. Use this to see what you need to work on.', {
        projectId: z.string().describe('Project ID'),
        userId: z.string().describe('Clerk user ID of the developer'),
        status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional().describe('Filter by status'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().describe('Filter by priority'),
    }, async ({ projectId, userId, status, priority }) => {
        const where = {
            projectId,
            assigneeId: userId,
            isArchived: false,
        };
        if (status)
            where.status = status;
        if (priority)
            where.priority = priority;
        const issues = await db.issue.findMany({
            where,
            include: {
                parent: { select: { id: true, title: true, number: true, type: true } },
                sprint: { select: { id: true, name: true, status: true } },
                _count: { select: { children: true } },
                project: { select: { key: true } },
            },
            orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        });
        const result = issues.map((i) => ({
            id: i.id,
            key: `${i.project.key}-${i.number}`,
            title: i.title,
            description: i.description,
            type: i.type,
            status: i.status,
            priority: i.priority,
            sprint: i.sprint?.name || null,
            sprintStatus: i.sprint?.status || null,
            parentTitle: i.parent?.title || null,
            subtaskCount: i._count.children,
            dueDate: i.dueDate?.toISOString() || null,
            updatedAt: i.updatedAt.toISOString(),
        }));
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    });
    // ─── Get a single task with full details ───
    server.tool('get_task_details', 'Get complete details of a specific task including description, subtasks, parent story, sprint info, and project tech stack. Use this before starting work on a task.', { issueId: z.string().describe('Issue/task ID') }, async ({ issueId }) => {
        const issue = await db.issue.findUnique({
            where: { id: issueId },
            include: {
                assignee: { select: { name: true, email: true } },
                reporter: { select: { name: true, email: true } },
                parent: { select: { id: true, title: true, number: true, type: true, description: true } },
                children: {
                    where: { isArchived: false },
                    select: { id: true, title: true, number: true, type: true, status: true, priority: true },
                    orderBy: { number: 'asc' },
                },
                sprint: { select: { id: true, name: true, status: true, endDate: true } },
                project: {
                    select: {
                        id: true, key: true, name: true,
                        setup: { select: { techStack: true, vision: true, aiInstructions: true, githubRepoUrl: true } },
                    },
                },
            },
        });
        if (!issue) {
            return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
        }
        const result = {
            id: issue.id,
            key: `${issue.project.key}-${issue.number}`,
            title: issue.title,
            description: issue.description,
            type: issue.type,
            status: issue.status,
            priority: issue.priority,
            dueDate: issue.dueDate?.toISOString() || null,
            startDate: issue.startDate?.toISOString() || null,
            assignee: issue.assignee?.name || 'Unassigned',
            reporter: issue.reporter?.name || 'Unknown',
            sprint: issue.sprint ? {
                name: issue.sprint.name,
                status: issue.sprint.status,
                endDate: issue.sprint.endDate?.toISOString() || null,
            } : null,
            parent: issue.parent ? {
                key: `${issue.project.key}-${issue.parent.number}`,
                title: issue.parent.title,
                type: issue.parent.type,
                description: issue.parent.description,
            } : null,
            subtasks: issue.children.map((c) => ({
                key: `${issue.project.key}-${c.number}`,
                title: c.title,
                type: c.type,
                status: c.status,
                priority: c.priority,
            })),
            project: {
                name: issue.project.name,
                techStack: issue.project.setup?.techStack || null,
                vision: issue.project.setup?.vision || null,
                aiInstructions: issue.project.setup?.aiInstructions || null,
                githubRepoUrl: issue.project.setup?.githubRepoUrl || null,
            },
        };
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    });
    // ─── Find task by key (e.g., PROJ-123) ───
    server.tool('find_task_by_key', 'Find a task by its project key and number (e.g., "PROJ-42"). Use when you know the task key but not the ID.', {
        projectKey: z.string().describe('Project key (e.g., "PROJ")'),
        taskNumber: z.number().describe('Issue number (e.g., 42)'),
    }, async ({ projectKey, taskNumber }) => {
        const project = await db.project.findUnique({
            where: { key: projectKey },
            select: { id: true },
        });
        if (!project) {
            return { content: [{ type: 'text', text: `Project with key "${projectKey}" not found` }], isError: true };
        }
        const issue = await db.issue.findUnique({
            where: {
                projectId_number: { projectId: project.id, number: taskNumber },
            },
            include: {
                assignee: { select: { name: true } },
                sprint: { select: { name: true, status: true } },
                parent: { select: { title: true, number: true, type: true } },
                project: { select: { key: true } },
                _count: { select: { children: true } },
            },
        });
        if (!issue) {
            return { content: [{ type: 'text', text: `Task ${projectKey}-${taskNumber} not found` }], isError: true };
        }
        const result = {
            id: issue.id,
            key: `${issue.project.key}-${issue.number}`,
            title: issue.title,
            description: issue.description,
            type: issue.type,
            status: issue.status,
            priority: issue.priority,
            assignee: issue.assignee?.name || 'Unassigned',
            sprint: issue.sprint?.name || null,
            parent: issue.parent ? `${projectKey}-${issue.parent.number}: ${issue.parent.title}` : null,
            subtaskCount: issue._count.children,
            dueDate: issue.dueDate?.toISOString() || null,
        };
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    });
    // ─── Update task status ───
    server.tool('update_task_status', 'Update the status of a task (e.g., move from TODO to IN_PROGRESS when you start working, or to DONE when finished). This changes the kanban board position.', {
        issueId: z.string().describe('Issue/task ID'),
        status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).describe('New status'),
    }, async ({ issueId, status }) => {
        const issue = await db.issue.findUnique({
            where: { id: issueId },
            select: { status: true, title: true, number: true, project: { select: { key: true } } },
        });
        if (!issue) {
            return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
        }
        const oldStatus = issue.status;
        const updated = await db.issue.update({
            where: { id: issueId },
            data: { status },
            select: { status: true },
        });
        return {
            content: [{
                    type: 'text',
                    text: `✅ ${issue.project.key}-${issue.number} "${issue.title}" moved from ${oldStatus} → ${updated.status}`,
                }],
        };
    });
    // ─── Add a comment/note to a task (update description) ───
    server.tool('update_task_description', 'Update or append to a task description. Useful for documenting findings, implementation notes, or context discovered during development.', {
        issueId: z.string().describe('Issue/task ID'),
        description: z.string().describe('New description or text to append'),
        append: z.boolean().default(false).describe('If true, appends to existing description instead of replacing'),
    }, async ({ issueId, description, append }) => {
        const existing = await db.issue.findUnique({
            where: { id: issueId },
            select: { description: true, title: true, number: true, project: { select: { key: true } } },
        });
        if (!existing) {
            return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
        }
        const newDescription = append && existing.description
            ? `${existing.description}\n\n---\n\n${description}`
            : description;
        await db.issue.update({
            where: { id: issueId },
            data: { description: newDescription },
        });
        return {
            content: [{
                    type: 'text',
                    text: `✅ Updated description for ${existing.project.key}-${existing.number} "${existing.title}"`,
                }],
        };
    });
    // ─── Search tasks ───
    server.tool('search_tasks', 'Search for tasks in a project by title or description keywords. Useful to find related tasks or check if a task already exists.', {
        projectId: z.string().describe('Project ID'),
        query: z.string().describe('Search query (searches in title and description)'),
        type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK']).optional().describe('Filter by issue type'),
    }, async ({ projectId, query, type }) => {
        const where = {
            projectId,
            isArchived: false,
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
            ],
        };
        if (type)
            where.type = type;
        const issues = await db.issue.findMany({
            where,
            select: {
                id: true, number: true, title: true, type: true, status: true, priority: true,
                assignee: { select: { name: true } },
                project: { select: { key: true } },
            },
            take: 20,
            orderBy: { updatedAt: 'desc' },
        });
        const result = issues.map((i) => ({
            id: i.id,
            key: `${i.project.key}-${i.number}`,
            title: i.title,
            type: i.type,
            status: i.status,
            priority: i.priority,
            assignee: i.assignee?.name || 'Unassigned',
        }));
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    });
    // ─── Create a new task ───
    server.tool('create_task', 'Create a new task/issue in a project. Use when you discover something that needs to be done, like a bug or a subtask.', {
        projectId: z.string().describe('Project ID'),
        title: z.string().describe('Task title'),
        description: z.string().optional().describe('Task description with context and acceptance criteria'),
        type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK']).default('TASK').describe('Issue type'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM').describe('Priority level'),
        assigneeId: z.string().optional().describe('Clerk user ID to assign (defaults to unassigned)'),
        reporterId: z.string().describe('Clerk user ID of the reporter (you)'),
        parentId: z.string().optional().describe('Parent issue ID (for subtasks)'),
        sprintId: z.string().optional().describe('Sprint ID to add the task to'),
    }, async ({ projectId, title, description, type, priority, assigneeId, reporterId, parentId, sprintId }) => {
        // Atomically increment issue counter
        const project = await db.project.update({
            where: { id: projectId },
            data: { issueCounter: { increment: 1 } },
            select: { issueCounter: true, key: true },
        });
        const issue = await db.issue.create({
            data: {
                number: project.issueCounter,
                title,
                description,
                type,
                priority,
                projectId,
                reporterId,
                assigneeId: assigneeId || undefined,
                parentId: parentId || undefined,
                sprintId: sprintId || undefined,
            },
        });
        return {
            content: [{
                    type: 'text',
                    text: `✅ Created ${project.key}-${issue.number}: "${issue.title}" (${issue.type}, ${issue.priority})`,
                }],
        };
    });
    // ─── Get all project tasks (overview) ───
    server.tool('get_all_tasks', 'Get all tasks in a project grouped by status. Provides a high-level overview of project progress.', {
        projectId: z.string().describe('Project ID'),
        sprintId: z.string().optional().describe('Filter to a specific sprint'),
    }, async ({ projectId, sprintId }) => {
        const where = { projectId, isArchived: false };
        if (sprintId)
            where.sprintId = sprintId;
        const issues = await db.issue.findMany({
            where,
            select: {
                id: true, number: true, title: true, type: true, status: true, priority: true,
                assignee: { select: { name: true } },
                project: { select: { key: true } },
            },
            orderBy: [{ status: 'asc' }, { priority: 'desc' }],
        });
        const grouped = {
            TODO: issues.filter((i) => i.status === 'TODO').map(fmt),
            IN_PROGRESS: issues.filter((i) => i.status === 'IN_PROGRESS').map(fmt),
            IN_REVIEW: issues.filter((i) => i.status === 'IN_REVIEW').map(fmt),
            DONE: issues.filter((i) => i.status === 'DONE').map(fmt),
            summary: {
                total: issues.length,
                todo: issues.filter((i) => i.status === 'TODO').length,
                inProgress: issues.filter((i) => i.status === 'IN_PROGRESS').length,
                inReview: issues.filter((i) => i.status === 'IN_REVIEW').length,
                done: issues.filter((i) => i.status === 'DONE').length,
            },
        };
        return {
            content: [{ type: 'text', text: JSON.stringify(grouped, null, 2) }],
        };
    });
}
function fmt(i) {
    return {
        id: i.id,
        key: `${i.project.key}-${i.number}`,
        title: i.title,
        type: i.type,
        priority: i.priority,
        assignee: i.assignee?.name || 'Unassigned',
    };
}
