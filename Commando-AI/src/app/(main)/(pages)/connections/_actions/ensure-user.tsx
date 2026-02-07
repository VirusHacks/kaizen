'use server'

import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'

/**
 * Ensures the current Clerk user exists in our database.
 * This is a fallback for when the Clerk webhook hasn't synced the user.
 */
export const ensureUserExists = async () => {
  const user = await currentUser()
  
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    // Check if user already exists by clerkId
    const existingUser = await db.user.findUnique({
      where: { clerkId: user.id },
    })

    if (existingUser) {
      return { success: true, user: existingUser, created: false }
    }

    // Use upsert to handle case where email might already exist
    const email = user.emailAddresses?.[0]?.emailAddress || ''
    
    const upsertedUser = await db.user.upsert({
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

    console.log('Created/updated user in database:', upsertedUser.clerkId)
    return { success: true, user: upsertedUser, created: true }
  } catch (error) {
    console.error('Error ensuring user exists:', error)
    return { success: false, error: String(error) }
  }
}
