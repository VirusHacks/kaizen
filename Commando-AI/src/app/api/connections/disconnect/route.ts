import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { service } = await request.json()
    
    if (!service) {
      return NextResponse.json({ error: 'Service is required' }, { status: 400 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    // Get database user
    const dbUser = await db.user.findUnique({
      where: { clerkId: userId }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    switch (service) {
      case 'Google Drive':
      case 'Google Calendar':
      case 'Gmail':
        // Clear Google tokens from Clerk metadata (shared for Drive, Calendar, and Gmail)
        const currentMetadata = user.privateMetadata || {}
        await client.users.updateUser(userId, {
          privateMetadata: {
            ...currentMetadata,
            googleAccessToken: null,
            googleRefreshToken: null,
          },
        })
        
        // Clear from database if stored there
        await db.user.update({
          where: { clerkId: userId },
          data: {
            googleResourceId: null,
          }
        })
        break

      case 'Discord':
        // Clear Discord webhook from database
        await db.discordWebhook.deleteMany({
          where: { userId: userId }
        })
        break

      case 'Slack':
        // Clear Slack connection from database
        await db.slack.deleteMany({
          where: { userId: userId }
        })
        break

      case 'Notion':
        // Clear Notion connection from database
        await db.notion.deleteMany({
          where: { userId: userId }
        })
        break

      default:
        return NextResponse.json({ error: 'Unknown service' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${service} disconnected successfully` 
    })

  } catch (error) {
    console.error('Error disconnecting service:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect service' },
      { status: 500 }
    )
  }
}
