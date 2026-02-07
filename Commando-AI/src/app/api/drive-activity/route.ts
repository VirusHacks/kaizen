import { google } from 'googleapis'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/db'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const fileId = searchParams.get('fileId') // Optional: specific file/folder to watch

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ message: 'User not found' }, { status: 401 })
  }

  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    // First check custom OAuth token (has Drive scope)
    const googleAccessToken = user.privateMetadata?.googleAccessToken as string | undefined
    
    if (googleAccessToken) {
      oauth2Client.setCredentials({
        access_token: googleAccessToken,
      })
    } else {
      // Fallback: Try Clerk's OAuth token
      const clerkResponse = await client.users.getUserOauthAccessToken(
        userId,
        'oauth_google'
      )

      if (!clerkResponse.data || clerkResponse.data.length === 0) {
        return NextResponse.json(
          { message: 'Google Drive not connected' },
          { status: 401 }
        )
      }
      
      oauth2Client.setCredentials({
        access_token: clerkResponse.data[0].token,
      })
    }

    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    })
    
    const channelId = uuidv4()

    // If watching a specific file, use files.watch instead of changes.watch
    if (fileId) {
      const listener = await drive.files.watch({
        fileId: fileId,
        supportsAllDrives: true,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: `${process.env.NGROK_URI}/api/drive-activity/notification`,
          kind: 'api#channel',
        },
      })

      if (listener.status === 200) {
        await db.user.updateMany({
          where: { clerkId: userId },
          data: { 
            googleResourceId: listener.data.resourceId,
          },
        })
        return new NextResponse(`Listening to file changes...`)
      }
    } else {
      // Watch all Drive changes
      const startPageTokenRes = await drive.changes.getStartPageToken({})
      const startPageToken = startPageTokenRes.data.startPageToken
      if (startPageToken == null) {
        throw new Error('startPageToken is unexpectedly null')
      }

      const listener = await drive.changes.watch({
        pageToken: startPageToken,
        supportsAllDrives: true,
        supportsTeamDrives: true,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: `${process.env.NGROK_URI}/api/drive-activity/notification`,
          kind: 'api#channel',
        },
      })

      if (listener.status === 200) {
        await db.user.updateMany({
          where: { clerkId: userId },
          data: { googleResourceId: listener.data.resourceId },
        })
        return new NextResponse('Listening to all Drive changes...')
      }
    }

    return new NextResponse('Oops! something went wrong, try again', { status: 500 })
  } catch (error: any) {
    console.error('Drive activity error:', error?.message || error)
    return new NextResponse(error?.message || 'Failed to create listener', { status: 500 })
  }
}
