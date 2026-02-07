'use server'

import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs/server'
import axios from 'axios'

/**
 * Ensures user exists in database before creating connections
 */
const ensureUserInDb = async (clerkId: string) => {
  // First check if user exists by clerkId
  const existingUserByClerkId = await db.user.findUnique({
    where: { clerkId },
  })

  if (existingUserByClerkId) return true

  // Get current user from Clerk to create/update DB record
  const user = await currentUser()
  if (!user || user.id !== clerkId) return false

  const email = user.emailAddresses?.[0]?.emailAddress || ''
  
  // Check if a user with this email already exists (but different clerkId)
  const existingUserByEmail = await db.user.findUnique({
    where: { email },
  })

  if (existingUserByEmail) {
    // Update the existing user's clerkId to match the current Clerk user
    await db.user.update({
      where: { email },
      data: {
        clerkId: user.id,
        name: user.firstName || user.username || existingUserByEmail.name,
        profileImage: user.imageUrl || existingUserByEmail.profileImage,
      },
    })
    console.log('Updated existing user with new clerkId:', clerkId)
    return true
  }

  // Create new user if neither clerkId nor email exists
  await db.user.create({
    data: {
      clerkId: user.id,
      email: email,
      name: user.firstName || user.username || '',
      profileImage: user.imageUrl || '',
    },
  })
  
  console.log('Created new user in database for Discord connection:', clerkId)
  return true
}

export const onDiscordConnect = async (
  channel_id: string,
  webhook_id: string,
  webhook_name: string,
  webhook_url: string,
  id: string,
  guild_name: string,
  guild_id: string
) => {
  //check if webhook id params set
  if (webhook_id) {
    // Ensure user exists in database first
    const userExists = await ensureUserInDb(id)
    if (!userExists) {
      console.error('Failed to ensure user exists for Discord connection')
      return
    }

    //check if webhook exists in database with userid
    const webhook = await db.discordWebhook.findFirst({
      where: {
        userId: id,
      },
      include: {
        connections: {
          select: {
            type: true,
          },
        },
      },
    })

    //if webhook does not exist for this user
    if (!webhook) {
      //create new webhook
      await db.discordWebhook.create({
        data: {
          userId: id,
          webhookId: webhook_id,
          channelId: channel_id!,
          guildId: guild_id!,
          name: webhook_name!,
          url: webhook_url!,
          guildName: guild_name!,
          connections: {
            create: {
              userId: id,
              type: 'Discord',
            },
          },
        },
      })
    }

    //if webhook exists return check for duplicate
    if (webhook) {
      //check if webhook exists for target channel id
      const webhook_channel = await db.discordWebhook.findUnique({
        where: {
          channelId: channel_id,
        },
        include: {
          connections: {
            select: {
              type: true,
            },
          },
        },
      })

      //if no webhook for channel create new webhook
      if (!webhook_channel) {
        await db.discordWebhook.create({
          data: {
            userId: id,
            webhookId: webhook_id,
            channelId: channel_id!,
            guildId: guild_id!,
            name: webhook_name!,
            url: webhook_url!,
            guildName: guild_name!,
            connections: {
              create: {
                userId: id,
                type: 'Discord',
              },
            },
          },
        })
      }
    }
  }
}

export const getDiscordConnectionUrl = async () => {
  const user = await currentUser()
  if (user) {
    const webhook = await db.discordWebhook.findFirst({
      where: {
        userId: user.id,
      },
      select: {
        url: true,
        name: true,
        guildName: true,
      },
    })

    return webhook
  }
}

export const postContentToWebHook = async (content: string, url: string) => {
  console.log(content)
  if (content != '') {
    const posted = await axios.post(url, { content })
    if (posted) {
      return { message: 'success' }
    }
    return { message: 'failed request' }
  }
  return { message: 'String empty' }
}
