'use server'

import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ProjectFormSchema } from '@/lib/types'
import { createDefaultWorkflow } from '../[projectId]/project-manager/settings/workflow/_actions/workflow-actions'
import { createRepository, getRepository } from '../../_actions/github-api'

/**
 * Ensures the current Clerk user exists in our database.
 * Fallback for when Clerk webhook hasn't synced the user.
 */
const ensureUserInDb = async () => {
  const user = await currentUser()
  if (!user) return null

  const existingUser = await db.user.findUnique({
    where: { clerkId: user.id },
  })

  if (existingUser) return user

  const email = user.emailAddresses?.[0]?.emailAddress || ''
  await db.user.upsert({
    where: { clerkId: user.id },
    update: {
      email: email,
      name: user.firstName || user.username || '',
      profileImage: user.imageUrl || '',
    },
    create: {
      clerkId: user.id,
      email: email,
      name: user.firstName || user.username || '',
      profileImage: user.imageUrl || '',
    },
  })

  console.log('Auto-created/updated user in database:', user.id)
  return user
}

/**
 * Get all projects for the current user
 */
export const getUserProjects = async () => {
  const user = await currentUser()
  if (!user) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    // Fetch projects where user is owner OR a member
    const projects = await db.project.findMany({
      where: {
        AND: [
          { isArchived: false },
          {
            OR: [
              { ownerId: user.id },
              {
                members: {
                  some: {
                    userId: user.id,
                  },
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { data: projects, error: null }
  } catch (error) {
    console.error('[GET_USER_PROJECTS]', error)
    return { error: 'Failed to fetch projects', data: null }
  }
}

/**
 * Get all archived projects for the current user
 */
export const getArchivedProjects = async () => {
  const user = await currentUser()
  if (!user) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    // Fetch archived projects where user is owner OR a member
    const projects = await db.project.findMany({
      where: {
        AND: [
          { isArchived: true },
          {
            OR: [
              { ownerId: user.id },
              {
                members: {
                  some: {
                    userId: user.id,
                  },
                },
              },
            ],
          },
        ],
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return { data: projects, error: null }
  } catch (error) {
    console.error('[GET_ARCHIVED_PROJECTS]', error)
    return { error: 'Failed to fetch archived projects', data: null }
  }
}

/**
 * Get a single project by ID
 */
export const getProjectById = async (projectId: string) => {
  const user = await currentUser()
  if (!user) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    const project = await db.project.findFirst({
      where: {
        id: projectId,
        ownerId: user.id,
      },
    })

    if (!project) {
      return { error: 'Project not found', data: null }
    }

    return { data: project, error: null }
  } catch (error) {
    console.error('[GET_PROJECT_BY_ID]', error)
    return { error: 'Failed to fetch project', data: null }
  }
}

/**
 * Check if GitHub is connected for the current user.
 * Checks both the Connections row AND the related GitHub record
 * to stay consistent with the connections page.
 */
export const checkGitHubConnection = async () => {
  const { userId } = await auth()
  if (!userId) return false

  // Check for a GitHub connection row linked to this user WITH a valid GitHub record
  const connection = await db.connections.findFirst({
    where: {
      type: 'GitHub',
      userId: userId,
    },
    include: {
      GitHub: true,
    },
  })

  // Only consider connected if the GitHub record actually exists with an access token
  return !!(connection?.GitHub?.accessToken)
}

/**
 * Parse a GitHub URL into owner and repo name
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'github.com') return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch {
    return null
  }
}

/**
 * Create a new project
 */
export const createProject = async (
  values: z.infer<typeof ProjectFormSchema>
) => {
  const user = await ensureUserInDb()
  if (!user) {
    return { error: 'User not authenticated', data: null }
  }

  // Validate input
  const validatedFields = ProjectFormSchema.safeParse(values)
  if (!validatedFields.success) {
    return { error: 'Invalid fields', data: null }
  }

  const {
    name,
    key,
    description,
    startDate,
    endDate,
    teamSize,
    techStack,
    vision,
    aiInstructions,
    githubOption,
    githubRepoName,
    githubRepoVisibility,
    githubRepoUrl,
  } = validatedFields.data

  try {
    // Check if project key already exists
    const existingProject = await db.project.findUnique({
      where: { key },
    })

    if (existingProject) {
      return { error: 'Project key already exists', data: null }
    }

    // Handle GitHub integration
    let repoUrl: string | undefined
    let repoName: string | undefined
    let repoOwner: string | undefined
    let githubError: string | undefined

    if (githubOption === 'create' && githubRepoName) {
      // Verify GitHub is connected before attempting repo creation
      const isConnected = await checkGitHubConnection()
      if (!isConnected) {
        return { error: 'GitHub is not connected. Please connect GitHub from the Connections page first.', data: null }
      }

      const result = await createRepository({
        name: githubRepoName,
        description: description || `Project: ${name}`,
        isPrivate: githubRepoVisibility === 'private',
        autoInit: true,
      })

      if (result.data) {
        repoUrl = result.data.html_url
        repoName = result.data.name
        repoOwner = result.data.owner.login
      } else {
        githubError = result.error || 'Failed to create GitHub repository'
        console.error('[CREATE_PROJECT] GitHub repo creation failed:', githubError)
        // Return error — don't create a project without the requested repo
        return { error: `GitHub repo creation failed: ${githubError}`, data: null }
      }
    } else if (githubOption === 'connect' && githubRepoUrl) {
      const parsed = parseGitHubUrl(githubRepoUrl)
      if (!parsed) {
        return { error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo', data: null }
      }

      const isConnected = await checkGitHubConnection()
      if (!isConnected) {
        return { error: 'GitHub is not connected. Please connect GitHub from the Connections page first.', data: null }
      }

      const result = await getRepository(parsed.owner, parsed.repo)
      if (result.data) {
        repoUrl = result.data.html_url
        repoName = result.data.name
        repoOwner = result.data.owner.login
      } else {
        return { error: `Cannot access repository: ${result.error}. Make sure you have access to this repo.`, data: null }
      }
    }

    // Create project + setup + membership in a transaction
    const project = await db.$transaction(async (tx) => {
      // 1. Create the project
      const proj = await tx.project.create({
        data: {
          name,
          key: key.toUpperCase(),
          description: description || '',
          ownerId: user.id,
        },
      })

      // 2. Create ProjectSetup with extended fields
      await tx.projectSetup.create({
        data: {
          projectId: proj.id,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          teamSize: teamSize ? Number(teamSize) : null,
          techStack: techStack || null,
          vision: vision || null,
          aiInstructions: aiInstructions || null,
          githubRepoUrl: repoUrl || null,
          githubRepoName: repoName || null,
          githubRepoOwner: repoOwner || null,
        },
      })

      // 3. Add current user as ProjectMember with role OWNER + departmentRole PM
      await tx.projectMember.create({
        data: {
          projectId: proj.id,
          userId: user.id,
          role: 'OWNER',
          departmentRole: 'PROJECT_MANAGER',
        },
      })

      return proj
    })

    // Auto-create default workflow for new project (outside transaction — non-critical)
    await createDefaultWorkflow(project.id)

    revalidatePath('/projects')
    return { data: project, error: null, message: 'Project created successfully' }
  } catch (error) {
    console.error('[CREATE_PROJECT]', error)
    return { error: 'Failed to create project', data: null }
  }
}

/**
 * Update an existing project
 */
export const updateProject = async (
  projectId: string,
  values: Partial<z.infer<typeof ProjectFormSchema>>
) => {
  const user = await currentUser()
  if (!user) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    // Check ownership
    const existingProject = await db.project.findFirst({
      where: {
        id: projectId,
        ownerId: user.id,
      },
    })

    if (!existingProject) {
      return { error: 'Project not found or access denied', data: null }
    }

    // If updating key, check it doesn't conflict
    if (values.key && values.key !== existingProject.key) {
      const keyExists = await db.project.findUnique({
        where: { key: values.key },
      })
      if (keyExists) {
        return { error: 'Project key already exists', data: null }
      }
    }

    const project = await db.project.update({
      where: { id: projectId },
      data: {
        ...(values.name && { name: values.name }),
        ...(values.key && { key: values.key.toUpperCase() }),
        ...(values.description !== undefined && { description: values.description }),
      },
    })

    revalidatePath('/projects')
    return { data: project, error: null, message: 'Project updated successfully' }
  } catch (error) {
    console.error('[UPDATE_PROJECT]', error)
    return { error: 'Failed to update project', data: null }
  }
}

/**
 * Archive a project (soft delete)
 */
export const archiveProject = async (projectId: string) => {
  const user = await currentUser()
  if (!user) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    // Check ownership
    const existingProject = await db.project.findFirst({
      where: {
        id: projectId,
        ownerId: user.id,
      },
    })

    if (!existingProject) {
      return { error: 'Project not found or access denied', data: null }
    }

    const project = await db.project.update({
      where: { id: projectId },
      data: { isArchived: true },
    })

    revalidatePath('/projects')
    return { data: project, error: null, message: 'Project archived successfully' }
  } catch (error) {
    console.error('[ARCHIVE_PROJECT]', error)
    return { error: 'Failed to archive project', data: null }
  }
}

/**
 * Restore an archived project
 */
export const restoreProject = async (projectId: string) => {
  const user = await currentUser()
  if (!user) {
    return { error: 'User not authenticated', data: null }
  }

  try {
    // Check ownership
    const existingProject = await db.project.findFirst({
      where: {
        id: projectId,
        ownerId: user.id,
      },
    })

    if (!existingProject) {
      return { error: 'Project not found or access denied', data: null }
    }

    const project = await db.project.update({
      where: { id: projectId },
      data: { isArchived: false },
    })

    revalidatePath('/projects')
    return { data: project, error: null, message: 'Project restored successfully' }
  } catch (error) {
    console.error('[RESTORE_PROJECT]', error)
    return { error: 'Failed to restore project', data: null }
  }
}
