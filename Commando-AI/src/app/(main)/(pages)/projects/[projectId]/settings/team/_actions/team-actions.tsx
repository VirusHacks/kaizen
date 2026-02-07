'use server'

import { db } from '@/lib/db'
import { auth, currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { ProjectRole } from '@prisma/client'

// ==========================================
// HELPERS
// ==========================================

/**
 * Get the current user ID
 */
const getCurrentUserId = async (): Promise<string | null> => {
  const { userId } = await auth()
  return userId
}

/**
 * Get user's role in a project
 */
const getUserProjectRole = async (
  projectId: string,
  userId: string
): Promise<ProjectRole | 'OWNER' | null> => {
  // Check if user is the project owner
  const project = await db.project.findFirst({
    where: { id: projectId, ownerId: userId },
  })
  if (project) return 'OWNER'

  // Check project membership
  const membership = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  })

  return membership?.role || null
}

/**
 * Check if user can manage members (Owner or Admin)
 */
const canManageMembers = (role: ProjectRole | 'OWNER' | null): boolean => {
  return role === 'OWNER' || role === 'ADMIN'
}

/**
 * Check if user can change roles (Owner only)
 */
const canChangeRoles = (role: ProjectRole | 'OWNER' | null): boolean => {
  return role === 'OWNER'
}

// ==========================================
// GET PROJECT MEMBERS
// ==========================================

export const getProjectMembers = async (projectId: string) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Get project with owner info
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: {
            clerkId: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
      },
    })

    if (!project) {
      return { error: 'Project not found', data: null }
    }

    // Check if user has access (owner or member)
    const userRole = await getUserProjectRole(projectId, userId)
    if (!userRole) {
      return { error: 'Access denied', data: null }
    }

    // Get all members
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
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    })

    // Format response with owner included
    const formattedMembers = [
      {
        id: 'owner',
        userId: project.owner.clerkId,
        role: 'OWNER' as const,
        joinedAt: project.createdAt,
        user: project.owner,
      },
      ...members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      })),
    ]

    return {
      data: {
        members: formattedMembers,
        currentUserRole: userRole,
        projectOwnerId: project.ownerId,
      },
      error: null,
    }
  } catch (error) {
    console.error('[GET_PROJECT_MEMBERS]', error)
    return { error: 'Failed to fetch team members', data: null }
  }
}

// ==========================================
// INVITE PROJECT MEMBER
// ==========================================

export const inviteProjectMember = async (
  projectId: string,
  email: string,
  role: ProjectRole = 'MEMBER'
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check if current user can manage members
    const currentUserRole = await getUserProjectRole(projectId, userId)
    if (!canManageMembers(currentUserRole)) {
      return { error: 'You do not have permission to invite members', data: null }
    }

    // Only Owner can invite as Admin
    if (role === 'ADMIN' && !canChangeRoles(currentUserRole)) {
      return { error: 'Only project owner can assign Admin role', data: null }
    }

    // Find user by email
    const invitedUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!invitedUser) {
      return { error: 'User not found. They must sign up first.', data: null }
    }

    // Check if user is already the owner
    const project = await db.project.findUnique({
      where: { id: projectId },
    })
    if (project?.ownerId === invitedUser.clerkId) {
      return { error: 'This user is the project owner', data: null }
    }

    // Check if already a member
    const existingMember = await db.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: invitedUser.clerkId },
      },
    })
    if (existingMember) {
      return { error: 'User is already a member of this project', data: null }
    }

    // Create membership
    const member = await db.projectMember.create({
      data: {
        projectId,
        userId: invitedUser.clerkId,
        role,
      },
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
    })

    revalidatePath(`/projects/${projectId}/settings/team`)
    return { data: member, error: null, message: 'Member invited successfully' }
  } catch (error) {
    console.error('[INVITE_PROJECT_MEMBER]', error)
    return { error: 'Failed to invite member', data: null }
  }
}

// ==========================================
// UPDATE MEMBER ROLE
// ==========================================

export const updateMemberRole = async (
  projectId: string,
  memberId: string,
  newRole: ProjectRole
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Only Owner can change roles
    const currentUserRole = await getUserProjectRole(projectId, userId)
    if (!canChangeRoles(currentUserRole)) {
      return { error: 'Only project owner can change roles', data: null }
    }

    // Find the member
    const member = await db.projectMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.projectId !== projectId) {
      return { error: 'Member not found', data: null }
    }

    // Cannot change owner's role (owner is not in ProjectMember table)
    // This check is a safeguard

    const updatedMember = await db.projectMember.update({
      where: { id: memberId },
      data: { role: newRole },
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
    })

    revalidatePath(`/projects/${projectId}/settings/team`)
    return { data: updatedMember, error: null, message: 'Role updated successfully' }
  } catch (error) {
    console.error('[UPDATE_MEMBER_ROLE]', error)
    return { error: 'Failed to update role', data: null }
  }
}

// ==========================================
// REMOVE PROJECT MEMBER
// ==========================================

export const removeProjectMember = async (
  projectId: string,
  memberId: string
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check permissions
    const currentUserRole = await getUserProjectRole(projectId, userId)
    
    // Find the member to remove
    const member = await db.projectMember.findUnique({
      where: { id: memberId },
    })

    if (!member || member.projectId !== projectId) {
      return { error: 'Member not found', data: null }
    }

    // Allow self-removal (leaving the project)
    const isSelfRemoval = member.userId === userId

    // Admin can remove Members/Viewers, Owner can remove anyone
    if (!isSelfRemoval) {
      if (!canManageMembers(currentUserRole)) {
        return { error: 'You do not have permission to remove members', data: null }
      }

      // Admin cannot remove other Admins
      if (currentUserRole === 'ADMIN' && member.role === 'ADMIN') {
        return { error: 'Admins cannot remove other Admins', data: null }
      }
    }

    await db.projectMember.delete({
      where: { id: memberId },
    })

    revalidatePath(`/projects/${projectId}/settings/team`)
    return { data: null, error: null, message: 'Member removed successfully' }
  } catch (error) {
    console.error('[REMOVE_PROJECT_MEMBER]', error)
    return { error: 'Failed to remove member', data: null }
  }
}

// ==========================================
// CHECK PROJECT ACCESS
// ==========================================

/**
 * Utility to check if a user has access to a project
 * Used by other features to enforce permissions
 */
export const checkProjectAccess = async (
  projectId: string,
  requiredRole?: ProjectRole | 'OWNER'
) => {
  const userId = await getCurrentUserId()
  if (!userId) {
    return { hasAccess: false, role: null, error: 'User not authenticated' }
  }

  const role = await getUserProjectRole(projectId, userId)
  if (!role) {
    return { hasAccess: false, role: null, error: 'Access denied' }
  }

  // Role hierarchy: OWNER > ADMIN > MEMBER > VIEWER
  const roleHierarchy: Record<ProjectRole | 'OWNER', number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  }

  if (requiredRole && roleHierarchy[role] < roleHierarchy[requiredRole]) {
    return { hasAccess: false, role, error: 'Insufficient permissions' }
  }

  return { hasAccess: true, role, error: null }
}

// ==========================================
// SEARCH USERS FOR INVITE
// ==========================================

export const searchUsersForInvite = async (
  projectId: string,
  query: string
) => {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return { error: 'User not authenticated', data: null }
    }

    // Check if user can invite
    const currentUserRole = await getUserProjectRole(projectId, userId)
    if (!canManageMembers(currentUserRole)) {
      return { error: 'You do not have permission to invite members', data: null }
    }

    if (!query || query.length < 2) {
      return { data: [], error: null }
    }

    // Get existing members and owner
    const project = await db.project.findUnique({
      where: { id: projectId },
    })
    const existingMembers = await db.projectMember.findMany({
      where: { projectId },
      select: { userId: true },
    })

    const excludeIds = [
      project?.ownerId || '',
      ...existingMembers.map((m) => m.userId),
    ].filter(Boolean)

    // Search users by email or name
    const users = await db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: query.toLowerCase(), mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
          { clerkId: { notIn: excludeIds } },
        ],
      },
      select: {
        clerkId: true,
        name: true,
        email: true,
        profileImage: true,
      },
      take: 10,
    })

    return { data: users, error: null }
  } catch (error) {
    console.error('[SEARCH_USERS_FOR_INVITE]', error)
    return { error: 'Failed to search users', data: null }
  }
}
