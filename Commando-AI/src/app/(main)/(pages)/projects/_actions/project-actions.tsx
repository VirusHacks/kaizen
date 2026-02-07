'use server'

import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ProjectFormSchema } from '@/lib/types'
import { createDefaultWorkflow } from '../[projectId]/settings/workflow/_actions/workflow-actions'

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
    const projects = await db.project.findMany({
      where: {
        ownerId: user.id,
        isArchived: false,
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
    const projects = await db.project.findMany({
      where: {
        ownerId: user.id,
        isArchived: true,
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

  const { name, key, description } = validatedFields.data

  try {
    // Check if project key already exists
    const existingProject = await db.project.findUnique({
      where: { key },
    })

    if (existingProject) {
      return { error: 'Project key already exists', data: null }
    }

    const project = await db.project.create({
      data: {
        name,
        key: key.toUpperCase(),
        description: description || '',
        ownerId: user.id,
      },
    })

    // Auto-create default workflow for new project
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
