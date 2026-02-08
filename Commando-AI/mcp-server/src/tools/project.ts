import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '../db.js';

export function registerProjectTools(server: McpServer) {
  // ─── List all projects for a user ───
  server.tool(
    'list_projects',
    'List all projects the user is a member of or owns. Returns project ID, name, key, and description.',
    { userId: z.string().describe('Clerk user ID of the developer') },
    async ({ userId }) => {
      const projects = await db.project.findMany({
        where: {
          isArchived: false,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        select: {
          id: true,
          name: true,
          key: true,
          description: true,
          _count: { select: { issues: true, members: true, sprints: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    },
  );

  // ─── Get full project context ───
  server.tool(
    'get_project_context',
    'Get full project context including tech stack, vision, AI instructions, team members, GitHub repo info, and counts. Essential for understanding what a project is about before working on tasks.',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const project = await db.project.findUnique({
        where: { id: projectId },
        include: {
          setup: true,
          members: {
            include: {
              user: { select: { name: true, email: true, clerkId: true } },
            },
          },
          _count: { select: { issues: true, sprints: true } },
        },
      });

      if (!project) {
        return {
          content: [{ type: 'text' as const, text: 'Project not found' }],
          isError: true,
        };
      }

      const context = {
        id: project.id,
        name: project.name,
        key: project.key,
        description: project.description,
        createdAt: project.createdAt.toISOString(),
        totalIssues: project._count.issues,
        totalSprints: project._count.sprints,
        setup: project.setup
          ? {
              startDate: project.setup.startDate?.toISOString() || null,
              endDate: project.setup.endDate?.toISOString() || null,
              teamSize: project.setup.teamSize,
              techStack: project.setup.techStack,
              vision: project.setup.vision,
              aiInstructions: project.setup.aiInstructions,
              githubRepoUrl: project.setup.githubRepoUrl,
              githubRepoName: project.setup.githubRepoName,
              githubRepoOwner: project.setup.githubRepoOwner,
            }
          : null,
        members: project.members.map(
          (m: {
            role: string;
            departmentRole: string;
            user: { name: string | null; email: string | null };
          }) => ({
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            departmentRole: m.departmentRole,
          }),
        ),
      };

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(context, null, 2) },
        ],
      };
    },
  );

  // ─── Get project coding standards / AI instructions ───
  server.tool(
    'get_coding_standards',
    'Get the project coding standards, AI instructions, and tech stack. Use this to understand how code should be written for this project.',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const project = await db.project.findUnique({
        where: { id: projectId },
        select: {
          name: true,
          key: true,
          setup: {
            select: { techStack: true, vision: true, aiInstructions: true },
          },
        },
      });

      if (!project) {
        return {
          content: [{ type: 'text' as const, text: 'Project not found' }],
          isError: true,
        };
      }

      const result = {
        project: `${project.name} (${project.key})`,
        techStack: project.setup?.techStack || 'Not specified',
        vision: project.setup?.vision || 'Not specified',
        aiInstructions:
          project.setup?.aiInstructions || 'No specific instructions set',
      };

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    },
  );

  // ─── Get project members ───
  server.tool(
    'get_team_members',
    'List all team members in a project with their roles and department roles.',
    { projectId: z.string().describe('Project ID') },
    async ({ projectId }) => {
      const members = await db.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              clerkId: true,
              name: true,
              email: true,
              profileImage: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      });

      const result = members.map(
        (m: {
          role: string;
          departmentRole: string;
          joinedAt: Date;
          user: { clerkId: string; name: string | null; email: string | null };
        }) => ({
          userId: m.user.clerkId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          departmentRole: m.departmentRole,
          joinedAt: m.joinedAt.toISOString(),
        }),
      );

      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    },
  );
}
