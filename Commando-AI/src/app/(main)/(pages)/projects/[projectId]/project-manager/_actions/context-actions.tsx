'use server'

import { db } from '@/lib/db'

/**
 * Get full project context for the AI agent: project details + setup + members
 */
export async function getProjectContext(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      setup: true,
      members: {
        include: {
          user: {
            select: { name: true, email: true, clerkId: true },
          },
        },
      },
      _count: {
        select: {
          issues: true,
          sprints: true,
        },
      },
    },
  })

  if (!project) return null

  return {
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
    members: project.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      departmentRole: m.departmentRole,
    })),
  }
}
