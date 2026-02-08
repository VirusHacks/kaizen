'use server'

import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'

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

export const onGitHubConnect = async (
  accessToken: string,
  username: string,
  userId: string,
  installationId?: number,
  appSlug?: string,
  refreshToken?: string,
  expiresIn?: number
) => {
  if (accessToken) {
    try {
      // Ensure user exists in DB before creating GitHub connection
      await ensureUserInDb()

      // Calculate token expiry time
      const tokenExpiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : null

      // Check if a GitHub record already exists for this user (by userId)
      const existingGitHub = await db.gitHub.findFirst({
        where: { userId },
      })

      if (existingGitHub) {
        // Update existing GitHub record
        const updatedGitHub = await db.gitHub.update({
          where: { id: existingGitHub.id },
          data: {
            accessToken,
            username,
            ...(installationId ? { installationId } : {}),
            ...(appSlug ? { appSlug } : {}),
            ...(refreshToken ? { refreshToken } : {}),
            tokenExpiresAt,
          },
        })

        // Ensure a connection record exists
        const existingConn = await db.connections.findFirst({
          where: { type: 'GitHub', userId },
        })
        if (!existingConn) {
          await db.connections.create({
            data: { type: 'GitHub', userId, githubId: existingGitHub.id },
          })
        } else if (existingConn.githubId !== existingGitHub.id) {
          // Fix mismatched connection record
          await db.connections.update({
            where: { id: existingConn.id },
            data: { githubId: existingGitHub.id },
          })
        }

        return updatedGitHub
      }

      // Create new GitHub connection
      const github = await db.gitHub.create({
        data: {
          accessToken,
          username,
          userId,
          installationId: installationId || null,
          appSlug: appSlug || null,
          refreshToken: refreshToken || null,
          tokenExpiresAt,
        },
      })

      // Create connection record
      await db.connections.create({
        data: {
          type: 'GitHub',
          userId,
          githubId: github.id,
        },
      })

      return github
    } catch (error) {
      console.error('Error connecting GitHub:', error)
      throw error
    }
  }
}

export const getGitHubConnection = async (userId: string) => {
  try {
    const connection = await db.connections.findFirst({
      where: {
        type: 'GitHub',
        userId: userId,
      },
      include: {
        GitHub: true,
      },
    })

    return connection?.GitHub || null
  } catch (error) {
    console.error('Error getting GitHub connection:', error)
    return null
  }
}

export const disconnectGitHub = async (userId: string) => {
  try {
    const connection = await db.connections.findFirst({
      where: {
        type: 'GitHub',
        userId: userId,
      },
      include: {
        GitHub: true,
      },
    })

    if (connection) {
      // Delete the GitHub record
      if (connection.GitHub) {
        await db.gitHub.delete({
          where: {
            id: connection.GitHub.id,
          },
        })
      }

      // Delete the connection record
      await db.connections.delete({
        where: {
          id: connection.id,
        },
      })

      return { success: true }
    }

    return { success: false, message: 'Connection not found' }
  } catch (error) {
    console.error('Error disconnecting GitHub:', error)
    return { success: false, message: 'Failed to disconnect' }
  }
}
