'use server'

import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'
import { Client } from '@notionhq/client'

/**
 * Ensures user exists in database before creating connections
 */
const ensureUserInDb = async (clerkId: string) => {
  const existingUser = await db.user.findUnique({
    where: { clerkId },
  })

  if (existingUser) return true

  // Get current user from Clerk to create DB record
  const user = await currentUser()
  if (!user || user.id !== clerkId) return false

  const email = user.emailAddresses?.[0]?.emailAddress || ''
  
  // Use upsert to handle case where email already exists but clerkId doesn't match
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
  
  console.log('Auto-created/updated user in database for Notion connection:', clerkId)
  return true
}

export const onNotionConnect = async (
  access_token: string,
  workspace_id: string,
  workspace_icon: string,
  workspace_name: string,
  database_id: string,
  id: string
) => {
  'use server'
  if (access_token && workspace_id) {
    // Ensure user exists in database first
    const userExists = await ensureUserInDb(id)
    if (!userExists) {
      console.error('Failed to ensure user exists for Notion connection')
      return
    }

    //check if notion is connected
    const notion_connected = await db.notion.findFirst({
      where: {
        accessToken: access_token,
      },
      include: {
        connections: {
          select: {
            type: true,
          },
        },
      },
    })

    if (!notion_connected) {
      //create connection
      await db.notion.create({
        data: {
          userId: id,
          workspaceIcon: workspace_icon || '',
          accessToken: access_token,
          workspaceId: workspace_id,
          workspaceName: workspace_name || 'Notion Workspace',
          databaseId: database_id || 'pending', // Use 'pending' if not yet selected
          connections: {
            create: {
              userId: id,
              type: 'Notion',
            },
          },
        },
      })
    }
  }
}
export const getNotionConnection = async () => {
  const user = await currentUser()
  if (user) {
    const connection = await db.notion.findFirst({
      where: {
        userId: user.id,
      },
    })
    if (connection) {
      return connection
    }
  }
}

export const getNotionDatabase = async (
  databaseId: string,
  accessToken: string
) => {
  const notion = new Client({
    auth: accessToken,
  })
  const response = await notion.databases.retrieve({ database_id: databaseId })
  return response
}

export const onCreateNewPageInDatabase = async (
  databaseId: string,
  accessToken: string,
  content: string
) => {
  const notion = new Client({
    auth: accessToken,
  })

  console.log(databaseId)
  const response = await notion.pages.create({
    parent: {
      type: 'database_id',
      database_id: databaseId,
    },
    properties: {
      name: [
        {
          text: {
            content: content,
          },
        },
      ],
    },
  })
  if (response) {
    return response
  }
}
