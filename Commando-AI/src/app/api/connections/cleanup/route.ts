import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Cleanup orphaned connection records where the related service record no longer exists
 */
export async function POST() {
  const { userId } = auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let cleaned = 0

    // Find all connections for this user
    const connections = await db.connections.findMany({
      where: { userId },
      include: {
        GitHub: true,
        DiscordWebhook: true,
        Slack: true,
        Notion: true,
      }
    })

    // Check each connection and delete if the related record doesn't exist
    for (const connection of connections) {
      let shouldDelete = false

      switch (connection.type) {
        case 'GitHub':
          if (!connection.GitHub) shouldDelete = true
          break
        case 'Discord':
          if (!connection.DiscordWebhook) shouldDelete = true
          break
        case 'Slack':
          if (!connection.Slack) shouldDelete = true
          break
        case 'Notion':
          if (!connection.Notion) shouldDelete = true
          break
      }

      if (shouldDelete) {
        await db.connections.delete({
          where: { id: connection.id }
        })
        cleaned++
      }
    }

    return NextResponse.json({ 
      success: true, 
      cleaned,
      message: `Cleaned up ${cleaned} orphaned connection(s)` 
    })

  } catch (error) {
    console.error('Error cleaning up connections:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup connections' },
      { status: 500 }
    )
  }
}
