import { z } from 'zod';
import { db } from '../db.js';
export function registerWorkflowTools(server) {
    // ─── Get allowed status transitions ───
    server.tool('get_allowed_transitions', 'Get the allowed status transitions from a given status in a project workflow. Use this before changing task status to know which transitions are valid.', {
        projectId: z.string().describe('Project ID'),
        currentStatus: z.string().describe('Current issue status (e.g., "TODO", "IN_PROGRESS")'),
    }, async ({ projectId, currentStatus }) => {
        const workflow = await db.projectWorkflow.findFirst({
            where: { projectId, isDefault: true },
            include: {
                transitions: {
                    include: {
                        fromStatus: true,
                        toStatus: true,
                    },
                },
            },
        });
        if (!workflow) {
            return { content: [{ type: 'text', text: 'No workflow found. Default transitions: TODO → IN_PROGRESS → IN_REVIEW → DONE' }] };
        }
        const allowed = workflow.transitions
            .filter((t) => t.fromStatus.status === currentStatus)
            .map((t) => ({
            toStatus: t.toStatus.status,
            toDisplayName: t.toStatus.displayName,
            transitionName: t.name,
            requiresAssignee: t.requiresAssignee,
            requiresComment: t.requiresComment,
        }));
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        currentStatus,
                        allowedTransitions: allowed,
                    }, null, 2),
                }],
        };
    });
    // ─── Get full workflow definition ───
    server.tool('get_workflow', 'Get the complete workflow definition for a project — all statuses and transitions. Useful for understanding the project process.', { projectId: z.string().describe('Project ID') }, async ({ projectId }) => {
        const workflow = await db.projectWorkflow.findFirst({
            where: { projectId, isDefault: true },
            include: {
                statuses: { orderBy: { order: 'asc' } },
                transitions: {
                    include: {
                        fromStatus: { select: { status: true, displayName: true } },
                        toStatus: { select: { status: true, displayName: true } },
                    },
                },
            },
        });
        if (!workflow) {
            return { content: [{ type: 'text', text: 'No workflow configured. Using default: TODO → IN_PROGRESS → IN_REVIEW → DONE' }] };
        }
        const result = {
            name: workflow.name,
            statuses: workflow.statuses.map((s) => ({
                status: s.status,
                displayName: s.displayName,
                order: s.order,
            })),
            transitions: workflow.transitions.map((t) => ({
                from: t.fromStatus.status,
                to: t.toStatus.status,
                name: t.name,
                requiresAssignee: t.requiresAssignee,
                requiresComment: t.requiresComment,
            })),
        };
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
    });
}
